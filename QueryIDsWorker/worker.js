
console.log('query id worker.js start');
var xQueryId = require('x-query-id');
xQueryId.run(function (err) {
    if (err) return console.error('error running query id worker:', err);
    console.info('query id worker exit');
});