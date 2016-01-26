
console.log('scoring worker.js start');
var xScoring = require('x-scoring');
xScoring.run(function (err) {
  if (err) return console.error('error running scoring worker:', err);
  console.info('scoring worker exit');
});
