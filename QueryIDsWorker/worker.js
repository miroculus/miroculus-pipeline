console.log('env variables', process.env);

var common = require('./common/index.js');
var log = common.log;
var retriever = require("./papersHandler");

(function () {
    "use strict";
    
    setInterval(function () {
        log.info('====================================================');
        log.info('Checking for new papers...');
        log.info('====================================================');
        
        retriever.getPapers();
        
        log.info('====================================================');
        log.info('Finished checking for new papers.');
        log.info('====================================================');
    }, 5000);

}());