// Mongo log transport.

var parseurl = require('url').parse;
var anodetunnel = require('anode-tunnel');
var rebus = require('rebus')(process.env.ANODE_REBUS);
var mongodb = require('mongodb');

exports.create = function(options, callback) {
  
  options = options || {};

  var url = process.env.ANODE_LOGGING_URL || options.url || 'mongodb://localhost:27017/anodelogs';

  // Create tunnel to the logging farm.
  anodetunnel(url, {log_level: 'warn'}, function (err, tunnelurl) {
    if (err) {
      console.error('Failed to create tunnel to logging server', err);
      return callback(err);
    }
    var purl = parseurl(tunnelurl);
    var host = purl.hostname;
    var port = parseInt(purl.port);
    var db = purl.pathname.replace('/', '');
    var collection = options.collection || 'log';
    var errorTimeout = options.errorTimeout || 10000;
    var aliveTimeout = options.aliveTimeout || 10000;

    var state = 'unopened';
    var timeoutId = null;
    var pending = [];

    var server = new mongodb.Server(host, port, {});
    var client = new mongodb.Db(db, server, { native_parser: false });

    var error;
    var _db;

    server.on('error', function (err) {
      // Close session. Next log will reopen.
      close();
    });

    client.on('error', function (err) {
      // Close session. Next log will reopen.
      close();
    });

    var transport = { name: 'mongo', log: log, query: query };

    // The transport is ready.
    return callback(err, transport);

    function close() {
      // Reset session if it is opened.
      if (state === 'opened') {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        // Next time try to open new session.
        client.close();
        state = 'unopened';
      }
    }

    function open(callback) {

      if (state === 'opening' || state === 'unopened') {
        //
        // While opening our MongoDB connection, append any callback
        // to a list that is managed by this instance.
        //
        pending.push(callback);

        if (state === 'opening') {
          return;
        }
      }
      else if (state === 'opened') {
        return callback();
      }
      else if (state === 'error') {
        return callback(error);
      }

      function flushPending(err) {
        //
        // Iterate over all callbacks that have accumulated during
        // the creation of the TCP socket.
        //
        for (var i = 0; i < pending.length; i++) {
          pending[i](err);
        }

        // Quickly truncate the Array (this is more performant).
        pending.length = 0;
      }

      function onError(err) {
        state = 'error';
        error = err;
        flushPending(err);
        // Close to be able to attempt opening later.
        client.close();
        // Retry new connection upon following request after error timeout expired.
        setTimeout(function () {
          // This is the only exit from error state.
          state = 'unopened';
        }, errorTimeout);
      }

      function onSuccess(db) {
        state = 'opened';
        _db = db;
        flushPending();
      }

      state = 'opening';
      client.open(function (err, db) {
        if (err) {
          return onError(err);
        }
        onSuccess(db);
      });
    }

    function log(level, msg, meta, callback) {
      callback = callback || function () {};

      open(function (err) {
        if (err) {
          return callback(err);
        }

        // Set a timeout to close the client connection
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(function () {
          // The session is idle. Closing it.
          close();
        }, aliveTimeout);

        function onError(err) {
          close();
          callback(err);
        }

        _db.collection(collection, function (err, col) {
          if (err) {
            return onError(err);
          }

          var entry = {
            timestamp: new Date(), // RFC3339/ISO8601 format instead of common.timestamp()
            level: level,
            message: msg,
            meta: meta
          };

          col.save(entry, { safe: true }, function (err) {
            if (err) {
              return onError(err);
            }

            callback();
          });
        });
      });
    }

    function connect(callback) {
      var dbopts = { auto_reconnect: true, poolSize: 1 };
      mongodb.connect(tunnelurl, dbopts, callback);
    }

    function buildQuery(options) {

      options = options || {};
      options.app = options.app || null;
      options.skip = options.skip || 0;
      options.top = options.top || 10;
      options.farm = options.farm || null;
      options.message = options.message || null;
      options.instance = options.instance || null;
      options.since = options.since || null;
      options.until = options.until || null;

      // construct query options

      var queryOptions = {
        limit: options.top,
        skip: options.skip,
        sort: { 'meta.time': -1, '_id': -1 }
      };

      //
      // construct query
      //

      var query = {};

      if (options.app) {
        query["meta.app"] = {'$in': options.app.split(/ *, */g)};
      }

      if (options.farm) {
        query["meta.domain"] = options.farm;
      }

      if (options.message) {
        query["message"] = { $regex: '.*' + options.message + '.*', $options: 'i' };
      }

      if (options.instance) {
        query["meta.instanceId"] = options.instance;
      }

      if (options.since) {
        queryOptions.sort = { 'meta.time': 1, '_id': 1 };
        query["meta.time"] = { $gte: new Date(Date.parse(options.since)) };
      }

      if (options.until)  {
        if (!options.since) {
          query["meta.time"] = { $lte: new Date(Date.parse(options.until)) };
        } else {
          query["meta.time"] = {
            $lte: new Date(Date.parse(options.until)),
            $gte: new Date(Date.parse(options.since))
          };
        }
      }

      if (options.levels) {
        query.level = { $in: options.levels };
      }

      return {
        options: queryOptions,
        query: query
      };
    }

    function query(options) {
      
      var query = buildQuery(options);
      options = query.options;
      query = query.query;

      var limit = parseInt(options.limit);
      var skip = parseInt(options.skip);

      var api = new process.EventEmitter();

      connect(function(err, db) {
        if (err) return api.emit('error', err);
        db.collection(collection, function (err, collection) {
          if (err) {
            db.close();
            return api.emit('error', err);
          }
          return collection
                  .find(query)
                  .sort(options.sort)
                  .limit(limit)
                  .skip(skip)
                  .each(function (err, doc) {
                    if (err) {
                      db.close();
                      return api.emit('error', err);
                    }

                    if (!doc) {
                      db.close();
                      return api.emit('end');
                    }

                    return api.emit('item', doc);
                  });
        });
      });

      return api;
    }
  });
}