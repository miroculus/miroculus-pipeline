console.log('env variables', process.env);

var common = require('./common/index.js');
var retriever = require("./retriever/pmcWrapper.js");


setInterval(function () {
    common.log.info('executing ts');
    retriever.getPapers();
}, 5000);