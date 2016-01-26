var log = require("x-log");
var Q = require("q");
var constants = require("x-constants");
var config = require("x-config");
var queue = require("x-queue");
var service = require("x-service");

var textParser = require("./textParser.js");

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
    var queueInConfig = {
        storageName: config.storage.account,
        storageKey: config.storage.key,
        queueName: config.queues.new_ids,
        checkFrequency: 1000
    };
    var queueOutConfig = {
        storageName: config.storage.account,
        storageKey: config.storage.key,
        queueName: config.queues.scoring,
        checkFrequency: 1000
    };

    var queueIn = queue(queueInConfig);
    var queueOut = queue(queueOutConfig);

    queueOut.init().then(function () {

        return queueIn.init().then(function () {
            log.info('start processing new ids queue');
            checkQueue();
        }, function (err) {
            log.error(err);
            return callback(err);
        });
        
    }, function (err) {
        log.error(err);
        return callback(err);
    });

    function checkQueue () {
        log.info("Quering for next message in queue");
        queueIn.getSingleMessage()
            .then(processMessage)
            .catch(processError)
            .finally(setNextCheck);
    }

    function processMessage(message) {
        
        // Checking that a message returned from the queue
        // if no message was returned, the queue is empty
        if (!message) { return; }
        
        var fields = constants.queues.fields;
        var messageDetails = JSON.parse(message.messagetext);
        var messageData = messageDetails.data;
        var docId = messageData.docId;
        var source = messageData.sourceId == constants.sources.PMC ? 'pmc' : 'pubmed';
        
        log.info("Processing document id {} from {}...", docId, source);
        
        return service.getDocumentContent(docId, source).then(function (paperContent) {
            var sentenses = textParser.turnTextToSentenses(paperContent);

            log.info('Found {} sentenses', sentenses && sentenses.length || 0);

            var sendMessagePromises = [];
            for (var i=0; i<=sentenses.length; i++) {
                var sentense = sentenses[i];
                var index = i;
                
                var fields = constants.queues.fields;
                var message = {
                    "requestType": constants.queues.action.SCORE,
                    "data": {
                        "sourceId": constants.sources.PMC,
                        "docId": docId,
                        "sentenceIndex": index,
                        "fromConceptTypeId": constants.conceptTypes.GENE,
                        "fromConceptName": 'geneX',
                        "toConceptTypeId": constants.conceptTypes.SPECIES,
                        "toConceptName": 'mirnaY',
                        "modelVersion": constants.queues.modelVersion,
                        "sentenceContent": sentense
                    }
                };
                
                var promise = queueOut.sendMessage(message);
                promise.catch(function (err) {
                    return log.error('failed to enqueu message: <{}> of paper <{}>', sentense, docId);
                });
                sendMessagePromises.push(promise);
            }
            
            Q.all(sendMessagePromises).then(function () {
                return log.info('done enqueuing messages for document <{}>', docId);
            }).catch(function (err) {
                return log.error('failed to enqueu messages for document <{}>', docId);
            });
            
        }).catch(function (err) {
            return log.error('failed to get content for message: \n{}\nError: \n{}', JSON.stringify(messageDetails), err);
        });
    }
    
    function processError(err) {
        log.error(err);
        return callback(err);
    }

    function setNextCheck () {
        log.info('Setting next check in {} milliseconds', queueInConfig.checkFrequency);
        setTimeout(checkQueue, queueInConfig.checkFrequency);
    }
}

module.exports = {
    run: run
};