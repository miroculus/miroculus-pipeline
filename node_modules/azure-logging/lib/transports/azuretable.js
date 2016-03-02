// Azure tables log transport.

var azure = require('azure-storage');
var base32 = require('base32');
var async = require('async');
var levels = require('../levels');

// Transport factory.
// Options are taken from farm logging transport configuration.
exports.create = function(options, callback) {

  options = options || {};

  var storageAccount = options.storage.account;
  var storageKey = options.storage.key;

  // Besides standard methods - log and query, the transport supports a few
  // specific management methods.
  var transport = { name: 'azuretable', log: log, query: query,
    scantables: scantables, cleanuptables: cleanuptables, settings: settings
  };

  // The ancor time is used to set table time slots identifiers.
  var ancortime = (options.ancortime || new Date('01 Jan 2012 00:00:00 GMT')).valueOf();
  // Units in which time periods are specified.
  var unit = options.unit || (1000 * 60 * 60 * 24); // 1 day
  // The time span fo a single table (time slot length).
  var tablespan = unit * (options.tablespan || 7); // 1 week
  // Number of time slots to keep.
  var ttl = tablespan * (options.ttl || 8); // 8 weeks
  // The timeout to wait for a batch of messages before sending them out.
  var batchwait = options.batchwait || 500; // 1/2 seconds.

  // Each table has its own writer. Those are the writers created by the transport.
  var writers = {};
  var tableService = azure.createTableService(storageAccount, storageKey);

  var MAX_NUMBER = 99999999999999; // 16-NOV-5138 09:46:39 GMT
  // Round robin id for each log item. Used to sort logs having the same timestamp.
  var lastId = MAX_NUMBER;
  // Prefix for logging table names.
  var TABLE_NAME_PREFIX = 'logv1';

  // The transport is ready.
  return callback(null, transport);

  // Convert time between timestamp format (milliseconds) and descending format that is used
  // to set items in the azure table.
  // The table has only one sort order and hence we sort items according to descending time.
  // The 1st items are the last.
  function timeconvert(timestamp) {
    return MAX_NUMBER - timestamp;
  }

  // Table time slot from time stamp.
  function slotid(timestamp) {
    return Math.floor((timestamp - ancortime) / tablespan);
  }

  // Get time slot timestamps - start and the end of the slot.
  function slottimestamp(slotId) {
    var timestamp = slotId * tablespan + ancortime;
    return { start: timestamp, end: timestamp + tablespan };
  }

  // Return transport parameters. Used by management plugin to setup periodic cleanup.
  function settings() {
    return {
      ancortime: new Date(ancortime),
      managetime: new Date(ancortime + (tablespan / 2)),
      unit: unit,
      tablespan: (tablespan / unit),
      ttl: options.ttl // If TTL is specifed, the farm is the one designated to handle cleanup.
    };
  }

  // Write log message.
  function log(level, msg, meta, callback) {

    callback = callback || function () {};
    var farm = meta.domain || 'none';
    var instance = meta.instanceId || 'none';
    var app = meta.app || 'none';
    var stackTop = meta.stackTop || 'none';
    var timestamp = (meta.time || new Date()).valueOf();

    var entGen = azure.TableUtilities.entityGenerator;

    var entity = {
      PartitionKey: entGen.String(app),
      // Sort entities according to descending time and descending count within the same app.
      // App name is used, since the same entity is inserted with 'all' partition key, which
      // is the index for reading logs not filtered by application name.
      RowKey: entGen.String(timeconvert(timestamp).toString() + '_' + app + '_' + (lastId--).toString()),
      level: entGen.String(level),
      stackTop: entGen.String(encodeURIComponent(stackTop)),
      message: entGen.String(encodeURIComponent(msg))
    };

    var slotId = slotid(timestamp);
    // Table name can include only alphanumeric characters and should be shorter than 64.
    var tableName =  TABLE_NAME_PREFIX + base32.encode(farm + '%' + instance + '%' + slotId);

    var entry = { entity: entity, callback: callback };
    // Get exiting writer, or if not exist, create the new one.
    var writer = writers[tableName] || createWriter();
    // Push entry into the writer and it will be handled.
    writer.push(entry);

    // Create writer into azure table.
    function createWriter() {
      // Before writer intialization is completed, it just queues the entries.
      var writer = { push: function(entry) { queue.push(entry); } };
      var queue = [];
      var timeout;
      // The azure tables maximal batch size. In fact, it is 200, but we use shorter batches,
      // as we experienced failures when batches are too big.
      var maxBatch = 100;

      // Take care the table for this writer exists.
      tableService.createTableIfNotExists(tableName, function(err) {
        if (err) {
          // Create writer that return error for each message. The error is returned
          // to the writer, which can reflect it via differrent log transport.
          console.error('Failed to create azure table %s', tableName, err);
          var err = 'Failed to initialize azure logging transport';
          writer.push = function(entry) {
            entry.callback(err);
          }
          // Process all pending entries.
          queue.forEach(function(entry) {
            writer.push(entry);
          });
        }
        else {
          // The table is OK.
          // Set new push method, which kicks insert batches.
          writer.push = function(entry) {
            queue.push(entry);
            if (queue.length === 1) {
              // Upon the 1st message in the batch, wait a little, to check
              // if a few more messages are comming.
              timeout = setTimeout(kick, batchwait);
            }
            // If maximal messages for batch are already queued, can kick batch immediately.
            if (queue.length >= maxBatch) kick();
          }
          // Writer is ready, kick the batches to send all queued items.
          kick();
        }
      });

      // The writer is associated with the table name.
      writers[tableName] = writer;
      // Cleanup writer after it is not needed anymore.
      setTimeout(
        function() { delete writers[tableName] },
        // When slot ends, nobody writes into it.
        slottimestamp(slotId).end - (new Date()).valueOf() + (tablespan / 2)
      );
      return writer;

      // Perform batch of inserts.
      function batch() {
        // There are 2 parallel batches - one for application index and one for
        // general index.
        var count = 2;
        var entries = [];
        var highp = 0;
        var error;
        var inserted;
        var batch;

        // Start application index batch.
        beginBatch();
        // Get entries from the queue, up to maximal size for a batch.
        for (var i = 0; i < maxBatch; i++) {
              var entry = queue.shift();
              if (!entry) break;
              entries.push(entry);
              if (levels.ishighp(entry.entity.level)) highp++;
              insertEntity(entry);

        }
        commit();

        if (highp > 0) count++;

        // Start general index batch.
        beginBatch();
        entries.forEach(function(entry) {
          // For each entry change partition key.
          entry.entity.PartitionKey = entGen.String('all');
          insertEntity(entry);
        });
        commit();

        if (highp > 0) {
          // Start high index batch.
          beginBatch();
          entries.forEach(function(entry) {
            if (levels.ishighp(entry.entity.level)) {
              // For each entry change partition key.
              entry.entity.PartitionKey = entGen.String('highp');
              insertEntity(entry);
            }
          });
          commit();
        }

        function beginBatch() {
            inserted = 0;
            batch = new azure.TableBatch();
        }

        function insertEntity(entry) {
          // If fails, catch the exception.
          try {
              batch.insertEntity(entry.entity, {echoContent: true});
              inserted++;
          }
          catch(err) {
            entry.err = err;
          }
        }

        function commit() {
          // Commit only if entries inserted. Might not be inserted if hit exception
          // on attempt to insert.
          var committed = false;
          if (inserted) {
            try {
                tableService.executeBatch(tableName, batch, completion);
                committed = true;
            }
            catch(err) {
              error = err;
            }
          }
          if (!committed) {
            completion();
          }
        }

        // Wait for all batches to complete.
        function completion(err, opRes, batchRes) {
          if (err) {
            error = err;
          }
          if ((--count) === 0) {
            // Upon completion of all batches, respond on entries.
            entries.forEach(function(entry) {
              entry.callback(entry.err || error);
            });
          }
        }
      }

      // Kick the batches.
      function kick() {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        // If there are messages, insert them into the table.
        while (queue.length) batch();
      }
    }
  }

  // Scan log tables.
  function scantables(options, callback) {

    options = options || {};

    var untilSlotId;

    if (options.until) {
      // If filtered out with until parameter, get the maximal slot id to scan.
      untilSlotId = slotid(options.until);
    }

    // The catalog of the tables.
    var catalog = {};

    // Start query all the tables in the account.
    tableService.listTablesSegmented(null, completion);

    function completion(err, result, response) {
      if (err) return callback(err);

        result.entries.forEach(function(name) {
            // Consider only logging tables.
            var match = (new RegExp('^' + TABLE_NAME_PREFIX + '(.*)')).exec(name);
            if (!match) return;
            // Parse table name to obtain table parameters.
            var compound = base32.decode(match[1]);
            var parsed = /^(.*)%(.*)%(.*)/.exec(compound);
            if (!parsed) return;
            // Get table parameters and filter out tables required.
            var farm = parsed[1];
            if (options.farm && options.farm !== farm) return;
            var instance = parsed[2];
            if (options.instance && options.instance !== instance) return;
            var slotId = parsed[3];
            if (untilSlotId && slotId > untilSlotId) return;

            // If no tables yet in this time slot, create time slot container for the tables.
            var timeSlot = catalog[slotId];
            if (!timeSlot) {
              timeSlot = { time: new Date(slottimestamp(slotId).start).toUTCString(), tables: []};
              catalog[slotId] = timeSlot;
            }
            // Add table description into the time slot.
            timeSlot.tables.push({ name: name, farm: farm, instance: instance });
          });

            // Continue query.
            if(result.continuationToken){
                console.log('continuing querying for tables');
                return tableService.listTablesSegmented(result.continuationToken, completion);
            }
            console.log('finished querying for tables');
            // The catalog of the required tables is ready.
            callback(null, catalog);
    }
  }

  // Convert date string into timestamp.
  function timestampfromdate(time) {
    return (new Date(Date.parse(time))).valueOf();
  }

  // Delete old, expired tables.
  function cleanuptables(options, callback) {

    options = options || {};
    var now = new Date();
    // If specified until option, delete all tables until then.
    // If not, clean until the start of the 1st expired slot.
    options.until = timestampfromdate(options.until) || slottimestamp(slotid((new Date()).valueOf() - ttl) - 1).start;

    // Tables to delete.
    var tables = [];

    // Scan all tables to delete.
    scantables(options, function(err, catalog) {
      if (err) return callback(err);
      for (var slotId in catalog) {
        // Get all tables from the slot.
        tables = tables.concat(catalog[slotId].tables);
      }
      // Delete the tables.
      async.forEach(tables,
        function(table, cb) {
          tableService.deleteTable(table.name, cb);
        },
        function(err) {
          callback(err, { deleted: tables.length });
        }
      );
    });
  }

  // Query log messages.
  function query(options) {

    options = options || {};

    var api = new process.EventEmitter();

    if (options.until && typeof options.since != "number") {
      // Convert until parameter to time stamp.
      options.until = timestampfromdate(options.until);
    }
        
    if (options.since && typeof options.since != "number") {
      // Convert until parameter to time stamp.
      options.since = timestampfromdate(options.since);
    }

    // If quering high priority message and not per application, use special
    // partition to get them faster.
    if ((!options.app) && options.level && levels.ishighp(options.level)) {
      options.app = 'highp';
      // If need all high priority message, don't filter according to levels.
      if (levels.isallhighp(options.level)) {
        delete options.levels;
      }
    }

    // Regular expression for matching message text.
    var messageCondition;

    try {
      messageCondition = options.message && new RegExp(options.message);
    }
    catch(e) {
      console.warn('Failed to parse regular expression', options.message);
      messageCondition = null;  
    }

    // Scan tables which may contain required messages.
    scantables(options, function(err, catalog) {
      if (err) {
        api.emit('error', err);
        api.emit('end');
        return;
      }

      // Sort time slots.
      var timeSlots = [];
      for (var slotId in catalog) {
        timeSlots.push(slotId);
      }
      timeSlots = timeSlots.sort(function(a,b) {return b - a});

      var remaining = options.top;

      // Query messages from each time slot, until getting all required messages.
      async.forEachSeries(timeSlots, 
        function(slot, cb) {

          // No need to query tables in the slot, as reached the required amount.
          if (!remaining) {
            return cb();
          }

          // Streams for tables in the time slot.
          var streams = [];

          // Create streams for all tables in the time slot.
          catalog[slot].tables.forEach(function(table) {
            streams.push(createStream(table, remaining));
          });

          // Iterate over items from streams while merging in descending time order.
          loop(streams);

          // Iterate over items from streams as long as there are streams with items.
          // The iteration is performed to avoid stack overflow when completion is
          // synchronous. Therefore, callback completion is used only if IO operition on
          // one of the streams is going to be performed.
          function loop(streams) {
            for (; streams; streams = iteration(streams));
          }

          // Merge available items from streams.
          function iteration(streams) {
            var winner = { desctime: MAX_NUMBER };
            var next = [];
            var pending = [];

            // Find earliest item from all streams that have data.
            merge(streams);

            if (pending.length) {
              // Some streams are waiting for more data to come. Wait for all streams to be ready.
              async.forEach(pending,
                function(stream, cb) {
                  // Wait for the stream to be ready.
                  stream.more(cb);
                },
                function(err) {
                  if (err) {
                    api.emit('error', err);
                    return cb(err);
                  }
                  // Merge the remaining streams.
                  merge(pending);
                  // Start new synchronous iteration of the merge sort.
                  loop(emit());
                }
              );
              // Stop synchronous iteration. The iteration will continue asynchronously once pending
              // streams are ready.
              return null;
            }

            // All sreams are ready with data. Continue iteration with non-empty streams.
            return emit();

            // Find the earliest item from all streams.
            function merge(streams) {
              streams.forEach(function(stream) {
                var entry = stream.peek();
                if (!entry) {
                  // The stream need to be queried for more data.
                  return pending.push(stream);
                }
                // Stream can be used for next iteration.
                next.push(stream);
                if (entry.desctime < winner.desctime) {
                  winner.desctime = entry.desctime;
                  winner.stream = stream;
                }
              });
            }

            // Emit winning item if found.
            // Return streams to be used for following iterations.
            function emit() {
              var stream = winner.stream;
              if (!stream) {
                // All streams are empty.
                cb();
                return null;
              }
              api.emit('item', stream.pull().item);
              if ((--remaining)) {
                // Not over. Continue to the next iteration.
                return next;
              }
              else {
                // All required data is fetched. Stop streams. Stop the iterations.
                next.forEach(function(stream) {
                  stream.stop();
                });
                cb();
                return null;
              }
            }
          }
        }, 
        function() {
          api.emit('end');
        }
      );
    });

    return api;

    // Stram of items from a table.
    function createStream(table, remaining) {
      var stream = { peek: peek, more: more, pull: pull, stop: stop };

      var entries = [];
      var error;
      var pending = null;
      var maxLimit = 1000;

      // If we know exactly how many items to query, set the limit. If not known, fetch
      // as many as possible in each page.
      var top = remaining > maxLimit ? maxLimit : remaining;

      var partitionKey = options.app || 'all';

      if (messageCondition) {
        // If messages are filtered, query maximal number of entities each time.
        top = maxLimit;
      }
      var condition = "PartitionKey == '" + partitionKey + "'";
      if (options.until) {
        condition += (" and RowKey ge '" + timeconvert(options.until) + "'");
      }
      if (options.since) {
        condition += (" and RowKey le '" + timeconvert(options.since) + "'");
      }
      // Add level conditions.
      if (options.levels) {
        condition += " and ( ";
        var first = true;
        options.levels.forEach(function(level) {
            if (!first) condition += " or ";
            if (first) first = false;
            condition += ("level eq '" + level + "'");
        });
        condition += ")";
      }

        console.log('condition', condition);

      // Start query.
      var query = new azure.TableQuery().select().where(condition).top(top);
      tableService.queryEntities(table.name, query, null, completion);

      function completion(err, result, response) {
        if (err) {
          error = err;
          remaining = 0;
        }
        while (remaining > 0) {
          var entity = result.entries.shift();
          if (!entity) {
            break;
          }
          var message = decodeURIComponent(entity.message['_']);
          var stackTop = decodeURIComponent(entity.stackTop['_']);
          if (messageCondition && (!messageCondition.test(message))) continue;
          var rowkey = /(.*)_(.*)_/.exec(entity.RowKey['_']);
          var desctime = rowkey[1];
          var time = new Date(timeconvert(desctime));
          var app = rowkey[2];
          var meta = { domain: table.farm, instanceId: table.instance, app: app, time: time, stackTop: stackTop };
          var item = { level: entity.level['_'], message: message, meta: meta };
          var entry = { item: item, desctime: desctime}
          entries.push(entry);
          remaining--;
        }
        if (remaining > 0) {
          // If need more data, continue to the next page.

            // Continue query.
            if(result.continuationToken){
                console.log('continuing getting logs with', result.continuationToken);
                tableService.queryEntities(table.name, query, result.continuationToken, completion);
            }
            else {
                console.log('finished querying for logs');
                remaining = 0;
            }
        }
        // If there are waiter for the date from stream, notify that the stream has some.
        if (pending && (remaining === 0 || entries.length > 0)) {
          var callback = pending;
          pending = null;
          callback(error);
        }
      }

      // Get entry from the top of the stream.
      function peek() {
        return entries[0];
      }

      // Indicate when the stream has data.
      function more(callback) {
        if (remaining === 0) {
          return callback();
        }
        pending = callback;
      }

      // Remove the top of the stream.
      function pull() {
        return entries.shift();
      }

      // Stop the stream.
      function stop() {
        remaining = 0;
      }

      return stream;
    }
  }
}