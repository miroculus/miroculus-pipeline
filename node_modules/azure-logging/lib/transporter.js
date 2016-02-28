// Load logging transports.

var async = require('async');

// Pending calls to obtain transports.
var pending = [];

// The catalog of transports.
var transports = {};

// Transports configuration.
var config = { transports: transports };

// Descriptors of transports factories.
var descriptors = [];

// Get transports configuration.
module.exports = function(options, callback) {

    if(!options.transporters) throw new Error('transporters was not provided');
    var logTransporters = options.transporters;

    pending.push(callback);
    if(pending.length == 1) {
        init();
    }
    else {
        // Configuration is still obtained. Return to caller once ready.
        return pending.push(callback);
    }

    // The configurations was loaded already.
    //callback(config);

    function init() {
        // Go over logging configuration for the farm and load modules for all specified transports.
        logTransporters.forEach(function(desc) {
            var module = './transports/' + desc.name;
            descriptors.push({ factory: require(module), write: desc.write, options: desc.options });
            if (desc.default) {
                // Mark the transport that is the default transport for the farm.
                config.default = desc.name;
            }
        });

        // Invoke all transports factories and get transport instances.
        async.forEach(descriptors,
            function(desc, cb) {
                desc.factory.create(desc.options, function(err, transport) {
                    if (!err) {
                        transports[transport.name] = { transport: transport, write: desc.write };
                    }
                    // If not default transport and not transport that is used to write logs, ignore errors.
                    if (!desc.default && !desc.write) err = null;
                    cb(err);
                });
            },
            function(err) {
                if (err) {
                    // All specified transport should load. If not, crash everything on this farm.
                    throw new Error(err);
                }
                var p = pending;
                // Has to reset pending before calling callbacks, as can be called back from the
                // callback.
                pending = [];
                // Reply to all pending requests.
                p.forEach(function(callback) {
                    callback(config);
                });
            }
        );
    }

}
