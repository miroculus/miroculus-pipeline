var cluster = require('cluster');
var workers = process.env.WORKERS || require('os').cpus().length;

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

process.on('uncaughtException', function (err) {
  console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
  console.error(err.stack)
  process.exit(1)
})

function loadService() {
  console.log('paper parser worker started');
  var paperParser = require('x-paper-parser');
  paperParser.run(function (err) {
    if (err) return console.error('error running paper parser worker:', err);
    console.info('paper parser worker exit');
  });
}