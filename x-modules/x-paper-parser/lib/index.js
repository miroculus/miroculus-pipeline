var log = require("x-log");
var Q = require("q");
var constants = require("x-constants");
var config = require("x-config");
var queue = require("x-queue");
var service = require("x-docServiceProxy");
var async = require("async");

var textParser = require("./parser.js");
var documentUpserter =  require("./upserter")

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

    queueOut.init(function (err) {
        if (err) {
            log.error(err);
            return callback(err);
        }
        log.info('start processing scoring queue');
        
        return queueIn.init(function (err) {
            if (err) {
                log.error(err);
                return callback(err);
            }
            log.info('start processing new ids queue');
            
            checkQueue();
        });
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
            var sentences = textParser.turnTextToSentences(paperContent);

            log.info('Found {} sentences', sentences && sentences.length || 0);

            function processSentence(sentence, cb) {
                var index = sentences.indexOf(sentence);

                var outMessage = {
                    requestType: constants.queues.action.SCORE,
                    data: {
                        sourceId: constants.sources.PMC,
                        docId: docId,
                        sentenceIndex: index,
                        modelVersion: constants.queues.modelVersion,
                        sentence: sentence,
                        relations: [
                          {
                            entity1: {
                              typeId: constants.conceptTypes.MIRNA,
                              name: "mirnaX"
                            },
                            entity2: {
                              typeId: constants.conceptTypes.GENE,
                              name: "geneY"
                            },
                            relation: 2,
                            score: 0.56
                          },
                          {
                            entity1: {
                              typeId: constants.conceptTypes.MIRNA,
                              name: "mirnaX2"
                            },
                            entity2: {
                              typeId: constants.conceptTypes.GENE,
                              name: "geneY2"
                            },
                            relation: 1,
                            score: 0.57
                          }
                        ]
                    }
                };
                
                return queueOut.sendMessage(outMessage, function (err) {
                    
                    if (err) {
                        log.error('failed to enqueu message: <{}> of paper <{}>', sentense, docId);
                        return cb(err);
                    }
                    
                    // delete message from queue
                    return queueIn.deleteMessage(message).then(function (err) {
                        if (err) {
                            log.error('error deleting item from queue {}', err);
                            cb(err);
                        }

                        log.info('item deleted from queue');
                        return cb();
                    });
                });                
            }
            
            async.eachSeries(sentences, processSentence, function (err) {
                
                if (err) return log.error(err);
                
                // When done with all sentenses in the document, add a "Processing" status to document
                return documentUpserter.upsertDocument(docId, '', messageData.sourceId, function (error, result) {
                        
                    if (error) return log.error('There was an error inserting document row into database.');
                    
                    return log.info('done enqueuing messages for document <{}>', docId);
                });
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