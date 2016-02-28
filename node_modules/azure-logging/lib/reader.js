var format = require('./format');
var transporter = require('./transporter');
var levels = require('./levels');
var params = require('./params');

// Return reader in callback.
module.exports = function (options, callback) {

  options = options || {};
  options.format = options.format || 'text';

  // Obtain configuration of all transports.
  transporter({transporters: options.transporters}, function(config) {

    // Obtain the transport name to be used for reading logs with this reader.
    // If not specified explicitely, use default transport set for the farm.
    // If the farm is misconfigured, use azure table transport.
    var transportName = options.transport || config.default || 'azuretable';
    var transportDesc = config.transports[transportName];
    // If wrong transport specified, fail.
    if (!transportDesc) return callback(new Error('Failed to obtain transport ' + transportName));
    var transport = transportDesc.transport;

    var api = new process.EventEmitter();

    // Setup columns not to show if logs are filtered according to the following
    // parametes.
    var hiddenColumns = [];
    if (options.app) {
      hiddenColumns.push('app');
    }
    if (options.farm) {
      hiddenColumns.push('domain');
    }
    if (options.instance) {
      hiddenColumns.push('instance');
      options.instance = params.instanceNormalization(options.instance);
    }
    if (options.wide) hiddenColumns = [];

    if (options.level && (!levels.isall(options.level))) {
      options.levels = levels.levels(options.level);
    }

    //
    // initiate the query and propogate events
    //
    console.log('Start query');
    var q = transport.query(options);

    q.on('item', function (item) {
      // Show only items with formatted message.
      if (item.message) {
        return api.emit('line', format(options.format, item, hiddenColumns), item);
      }
    });

    q.on('error', function (err) {
      console.error('Error from query', err);
      return api.emit('error', err);
    });

    q.on('end', function () {
      console.log('End of query');
      return api.emit('end');
    });

    // Return reader.
    callback(null, api);

  });
}