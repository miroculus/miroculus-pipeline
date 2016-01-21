console.log('env variables', process.env);

var common = require('./common/index.js');
var retriever = require("./papersHandler");


setInterval(function () {
    common.log.info('executing ts');
    retriever.getPapers();
}, 5000);