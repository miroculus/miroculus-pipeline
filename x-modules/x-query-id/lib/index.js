var log = require("x-log");
var Q = require("q");
var moment = require("moment");
var constants = require("x-constants");
var config = require("x-config");
var queue = require("x-queue");
var service = require("x-docServiceProxy");
var async = require("async");

function run(callback) {

    callback = callback || Function;
    
    log.info('====================================================');
    log.info('Checking for new papers...');
    log.info('====================================================');
    
    // 1) Check for new items in queue
    // 2) while queue has items:
    //  2.1) pop item
    //  2.2) download paper with paper id
    //  2.3) parse paper into sentances
    //  2.4) insert each sentance into sentances queue

    log.info('====================================================');
    log.info('Finished checking for new papers.');
    log.info('====================================================');

    // Initializing queues
    var queueOutConfig = {
        storageName: config.storage.account,
        storageKey: config.storage.key,
        queueName: config.queues.new_ids,
        checkFrequency: 1000 /* every second */ 
    };
    var queueOut = queue(queueOutConfig);
    queueOut.init(function (err) {
        if (err) {
            log.error(err);
            return callback(err);
        }
        log.info('start processing new ids queue');
        checkForNewDocuments();
    });
    
    function checkForNewDocuments() {
        queryNewDocumentIDs(function (err) {
           if (err) log.error(err);
           
           return setNextCheck(); 
        });
    }
    
    function queryNewDocumentIDs(cb) {
        
        // Checking that a message returned from the queue
        // if no message was returned, the queue is empty
        var toDate = moment();
        var fromDate = moment().add(-3, 'days'); // TODO: change to 0 days (only today)
        log.info('getting papers from {} to {}', fromDate.format('YYYY-MM-DD'), toDate.format('YYYY-MM-DD'));

        // Run query for paperts in specific date
        return service.getPapers(fromDate.toDate(), toDate.toDate(), function (error, documents) {
            if (error) {
                log.error('There were several errors while retreiving the papers.');
                return cb(error);
            }
            
            if (!documents || !Array.isArray(documents)) { 
                log.warning('Returned data is not an array');
                return cb();
            }
            
            log.info('Found {} new documents', documents.length);
            log.info('Enqueuing documents...');
                    
            async.eachSeries(documents, enqueueDocument, function (err) {
                if (err) { 
                    log.error('failed to enqueu messages for documents.');
                    cb(err);
                }
                
                log.info('done enqueuing messages for all documents');
                cb();
            });
            
            return log.info('Completed itterating through retrieved documents, waiting for results to complete...');
            
            // Enqueuing each document as a pending request for processing
            function enqueueDocument(doc, cb) {
                var message = {
                    "requestType": constants.queues.action.GET_DOCUMENT,
                    "data": {
                        "docId": doc.docId,
                        "sourceId": doc.sourceId
                    }
                };
                log.info('Queuing document {} from source {}', doc.docId, doc.sourceId)
                return queueOut.sendMessage(message, function (err) {
                    if (error) {
                        log.error('There was an error enqueuing a document.');
                        return cb(err);
                    }
                    return cb();
                });
            }
        });
    }

    function setNextCheck () {
        log.info('Setting next check in {} milliseconds', queueOutConfig.checkFrequency);
        setTimeout(checkForNewDocuments, queueOutConfig.checkFrequency);
    }
}

module.exports = {
    run: run
};