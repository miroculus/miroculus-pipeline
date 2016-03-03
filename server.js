process.on('uncaughtException', handleError);

function handleError(err) {
  console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
  console.error(err.stack)
  process.exit(1)
}

var path = require('path');
var log = require('x-log');
var config = require('x-config');
var websiteName = process.env.PIPELINE_ROLE;

var websitePath = path.join(__dirname, 'websites', websiteName);
console.log('staring website:', websitePath);
var app = require(websitePath);

log.init({
    domain: process.env.COMPUTERNAME || '',
    instanceId: log.getInstanceId(),
    app: websiteName,
    level: config.log.level,
    transporters: config.log.transporters
  },
  function (err) {
    if (err) return handleError(err);
    console.log('starting %s server...', websiteName);

    var server = app.listen(app.get('port'), function (err) {
      if (err) return handleError(err);
      console.log('%s server listening on port %s', websiteName, server.address().port);
    });
  });
