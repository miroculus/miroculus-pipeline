process.on('uncaughtException', handleError);

function handleError(err) {
  console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
  console.error(err.stack);
  process.exit(1);
}

var path = require('path');
var appNodeModules = path.join(__dirname, 'pipeline_modules');
console.log('pipeline modules path:', appNodeModules);
require('app-module-path').addPath(appNodeModules);

var fs = require('fs');
var log = require('pl-log');
var config = require('pl-config');
var websiteName = process.env.PIPELINE_ROLE;

var websitePath = path.join(__dirname, 'websites', websiteName);
console.log('staring website:', websitePath);
if (!fs.existsSync(websitePath)) {
  console.warn('this is a worker role');
  require('http').createServer(function (req, res) {
    return res.end('hello from ' + process.env.PIPELINE_ROLE + ' worker');
  }).listen(process.env.PORT);
}
else {
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
}