var cluster = require('cluster');
var workers = process.env.WORKERS || require('os').cpus().length;
var log = require('x-log');
var config = require('x-config');

process.on('uncaughtException', handleError);

var workerName = process.env.PIPELINE_ROLE;

cloneAndStartProcess();

function cloneAndStartProcess() {
  if (cluster.isMaster) {
    console.log('start cluster with %s workers', workers);

    for (var i = 0; i < workers; ++i) {
      var worker = cluster.fork().process;
      console.log('worker %s started.', worker.pid);
    }

    cluster.on('exit', function(worker) {
      console.log('worker %s died. restart...', worker.process.pid);
      cluster.fork();
    });

  } else {
    loadService();
  }
}

function loadService() {
  var workerModule = require('x-' + workerName);

  log.init({
      domain: process.env.COMPUTERNAME || '',
      instanceId: log.getInstanceId(),
      app: workerName,
      level: config.log.level,
      transporters: config.log.transporters
    },
    function (err) {
      if (err) return handleError(err);
      console.log('starting %s worker...', workerName);

      return workerModule.run(function (err) {
        if (err) return console.error('error running %s, error:', workerName, err);
        console.info(workerName, 'worker exited');
      });
  });
}

function handleError(err) {
  console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
  console.error(err.stack);
  process.exit(1);
}

