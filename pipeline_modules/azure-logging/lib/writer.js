var util = require('util');
var interceptor = require('./interceptor');
var transporter = require('./transporter');
var async = require('async');
var levels = require('./levels');
var params = require('./params');

/**
* Creates a log writer.
* The log writer looks like `console.xxx` but will proxy all log requests to `winston`.
* You may copy all the methods from this object into `console` so that console will be replaced
* by this object. We don't have any state stored in `this`.
*/
module.exports = function (options, callback) {
  options = options || {};
  options.domain = options.domain || null;
  options.instanceId = options.instanceId || null;
  options.app = options.app || null;
  options.level = options.level || 'info';

  // Shorten instance name.
  var instance = params.instanceNormalization(options.instanceId);

  var logger;

  var api = { enabledLevels: [] };

  /**
  * Returns the logging level.
  */
  api.__defineGetter__('level', function () {
    return options.level;
  });

  levels.standard.forEach(function(level) {
    api[level] = function() {};
  });

  levels.levels(options.level).forEach(function(level) {
    api.enabledLevels.push(level);
    // stack trace only for high priority messages.
    // skip 2 frames and take top
    var stackTop = levels.ishighp(level) ? function() { return stackTrace(2)[0]; } : function() {};
    // Peform real logging for this level.
    api[level] = function () {
      var args = Array.prototype.slice.apply(arguments);
      var meta = {
        time: new Date(),
        args: args
      };
      if (options.domain) meta.domain = options.domain;
      if (options.app) meta.app = options.app;
      if (instance) meta.instanceId = instance;

      var msg = util.format.apply(null, args);

      var stack = stackTop();
      if (stack) meta.stackTop = stack;

      // Delay log entry by one second, so that logging code will not be
      // interleaved in processing the current request.
      // Next tick is not good enough as logging may delay more urgent stuff from
      // the queue.
      setTimeout(function () {
        // restore original console to log locally until logging function is completed
        interceptor.restore(console);
        logger.log(level, msg, meta);
        // replace console back to log writer
        interceptor.replace(console, api);
      }, 1000);
    };
  });

  // -- private

  /**
  * Returns the stack trace of the callsite
  * skip: how many lines to skip
  */
  function stackTrace(skip) {
    if (!skip) skip = 0;

    var e = new Error();
    var s = e.stack.split('\n');

    // skipping myself
    s = s.slice(2 + skip);

    var output = [];
    s.forEach(function (line) {
      output.push(line.replace('    at ', ''));
    });

    return output;
  }

  function createLogger(cb) {

    // Obtain logging transports.
    transporter({transporters: options.transporters}, function(config) {

      logger = { log: log };

      // Transports used to write logs.
      var transportLoggers = [];

      for (var key in config.transports) {
        var desc = config.transports[key];
        if (desc.write) {
          // Each transport that is configured to write logs should be called by the logger.
          transportLoggers.push(desc.transport);
        }
      }

      // Log message into transports.
      function log(level, msg, meta, callback) {
        callback = callback || function () {};
        async.forEach(transportLoggers,
          function(transport, cb) {
            transport.log(level, msg, meta, function(err) {
              if (err) {
                // Log the failure into all other transports.
                async.forEach(transportLoggers,
                  function(backupTransport, cb) {
                    // Skip the transport that failed.
                    if (backupTransport.name === transport.name) return cb();
                    // Log the report on logging failure with all the messsage details.
                    backupTransport.log(
                      level, // Use the same verbosity to avoid polution of errors. Anyway, not fatal, if there is other provider.
                      transport.name + ' failed to log [' + msg + '], err: ' + err.message,
                      meta,
                      function() {
                        // ignore error
                        cb();
                      }
                    );
                  },
                  function() {
                    // Return original error (not from backup transport, if any).
                    cb(err);
                  }
                );
              }
            });
          }, 
          callback
        );
      }
      cb();
    });
  }

  createLogger(function (err) {
    callback(err, api);
  });

};
