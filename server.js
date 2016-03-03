process.on('uncaughtException', handleError);

function handleError(err) {
  console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
  console.error(err.stack)
  process.exit(1)
}

var log = require('x-log');
var config = require('x-config');
var workerName = process.env.PIPELINE_ROLE || 'graph';

console.log('staring worker:', workerName);
var app = require('x-' + workerName);

log.init({
    domain: process.env.COMPUTERNAME || '',
    instanceId: log.getInstanceId(),
    app: workerName,
    level: config.log.level,
    transporters: config.log.transporters
  },
  function (err) {
    if (err) return handleError(err);
    console.log('starting %s server...', workerName);

    var server = app.listen(app.get('port'), function (err) {
      if (err) return handleError(err);
      console.log('%s server listening on port %s', workerName, server.address().port);
    });
  });
