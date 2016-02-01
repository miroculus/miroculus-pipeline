var log = require("x-log");
var Q = require("q");
var constants = require("x-constants");
var config = require("x-config");
var queue = require("x-queue");
var service = require("x-docServiceProxy");
var async = require("async");

var textParser = require("./parser.js");
var db =  require("x-db")

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
        queueIn.getSingleMessage(function (err, message) {
            if (err) {
                log.error(err);
                return callback(err);
            }
            log.info('Start processing message from queue...');
            
            processMessage(message, function (err) {
                if (err) log.error(err);
                
                setNextCheck();
            });
        });
    }

    function processMessage(message, cb) {
        
        // Checking that a message returned from the queue
        // if no message was returned, the queue is empty
        if (!message) { cb(); }
        
        var fields = constants.queues.fields;
        var messageDetails = JSON.parse(message.messagetext);
        var messageData = messageDetails.data;
        var docId = messageData.docId;
        var source = messageData.sourceId == constants.sources.PMC ? 'pmc' : 'pubmed';
        
        log.info("Processing document id {} from {}...", docId, source);
        
        // Add a "Processing" status to document
        return db.upsertDocument(docId, '', messageData.sourceId, function (err, result) {
                
            if (err) { 
                log.error('There was an error inserting document row into database.');
                return cb(err);
            }
            
            return service.getDocumentContent(docId, source, function (err, paperContent) {
                
                if (err) {
                    log.error(err); 
                    cb(err);
                }
                
                var sentences = textParser.turnTextToSentences(paperContent);

                log.info('Found {} sentences', sentences && sentences.length || 0);

                // Asynchroneously queuing all sentenses in current document
                return async.each(sentences, processSentence, function (err) {
                    
                    if (err) { 
                        log.error(err);
                        return cb(err);
                    }
                    
                    log.info('done enqueuing messages for document <{}>', docId);
                    
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
                
                /**
                 * This method is used to process each sentence returned from the document.
                 */
                function processSentence(sentence, cb) {
                    var index = sentences.indexOf(sentence);

                    var outMessage = {
                        requestType: constants.queues.action.SCORE,
                        data: {
                            sourceId: messageData.sourceId,
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
                        
                        log.info('Queued sentence {} in document {} from source {}', index, docId, messageData.sourceId)
                        cb();
                    });
                }
            });
        });
    }

    function setNextCheck () {
        log.info('Setting next check in {} milliseconds', queueInConfig.checkFrequency);
        setTimeout(checkQueue, queueInConfig.checkFrequency);
    }
}

module.exports = {
    run: run
};