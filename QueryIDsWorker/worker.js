console.log('env variables', process.env);

var common = require('./common/index.js');
var log = common.log;
var retriever = require("./papersHandler");

(function () {
    "use strict";

    // TODO: i'm not sure this is the best way to do this... not every 5 seconds, that's for sure...
    // anyway, we need to come up with a schedule mechanism, let's talk about that

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