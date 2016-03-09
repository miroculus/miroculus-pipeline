var constants = require("pl-constants");
var config = require("pl-config");
var service = require("pl-docServiceProxy");
var async = require("async");
var db = require("pl-db")
var pipelineWorker = require('pl-worker');

function run(cb) {

  var worker = pipelineWorker.start({
      processMessage: processMessage,
      queueInName: config.queues.new_ids,
      queueOutName: config.queues.scoring
    },
    function(err) {
      if (err) return cb(err);
      console.info('worker initialized successfully');
  });
    
  function processMessage(message, cb) {

    var data = message && message.data;
    var docId = parseInt(data.docId);
    var sourceId = data.sourceId;
    
    if (sourceId !== constants.sources.PMC) {
        message.info('skipping message processing, since it is not PMC source');
        return cb();
    }
    
    message.info("processing document: source: %s, id: %s", sourceId, docId);
    
    // Add a "Processing" status to document
    return db.upsertDocument({
        sourceId: sourceId,
        docId: docId,
        statusId: constants.documentStatus.PROCESSING    
      }, 
      function (err, result) {
        if (err) {
            message.error('there was an error inserting document row into database.');
            return cb(err);
        }
        
        // PMC: getting sentences of document from PMC service (TODO: extend for pubmed)
        message.log('searching for sentences...');
        // sample in the samples folder from here: http://104.197.190.17/doc/pmc/2000354
        return service.getDocumentSentences(docId, sourceId, function (err, sentencesArray) {
            if (err) {
              message.error(err);
              
              if (err.errorCode == service.ERRORS.NOT_ACCESSIBLE) {
                // the document is not accessible, no point in retrying.
                // we should delete it from the queue
                
                // mark status as NOT ACCESSIBLE in the DB
                var updateStatusOpts = {
                  sourceId: data.sourceId,
                  docId: data.docId,
                  statusId: constants.documentStatus.NOT_ACCESSIBLE
                };
                return db.updateDocumentStatus(updateStatusOpts, function (err) { 
                  if (err) {
                    message.error('error updating document status in db', updateStatusOpts, err);
                    return cb(err);
                  }
                  
                  // delete message from queue
                  message.warn('document is not accessible, deleting item', message);
                  return cb();
                });
              }
                
              return cb(err);
            }
            
            // filter out sentences with no mirna and genes,
            // normalize mention schemas (workaround until Giovanny fixes his code)
            // remove duplicate mentions
            // capture sentence index in the array
            var sentences = sentencesArray.sentences
              .filter(function (sentence) { 
                //var cache = {};
                var entities = sentence.mentions
                  // fix entities data
                  .map(function (mention) {
                    // this is a workaround, waiting for Giovanney to fix
                    if (typeof mention.value !== 'string') mention.value = mention.value.mirna || mention.value.origin || 'aaaaa';
                    mention.type = mention.type.toLowerCase(); 
                    return mention;
                  })
                  /*
                  // filter multiple instance of the same mentions
                  .filter(function (entity) {
                    var key = entity.type + '-' + entity.id;
                    if (!cache[key]) {
                      cache[key] = 1;
                      return entity;
                    }
                    return null;
                  })*/;
                  
              
                // check that we have at least one mirna and one gene
                var genes = entities.filter(function (mention) {
                  return mention.type === constants.entitiesName.GENE ? mention : null;
                });

                var mirnas = entities.filter(function (mention) {
                  return mention.type === constants.entitiesName.MIRNA ? mention : null;
                });
                
                // filter out sentences with no mirna and genes,
                if (!genes.length || !mirnas.length) {
                  message.log('filtering out a sentence with no mirna and gene', sentence);
                  return null;
                }
                  
                return sentence; 
              })
              // capture sentence index in the array
              .map(function (sentence, index) {
                return { data: sentence, index: index };
              });
            
            message.info('found %s relevant sentences for scoring', sentences.length);
            
            // Asynchronously queuing all sentences in current document
            return async.each(sentences, processSentence, function (err) {
              if (err) {
                message.error(err);
                return cb(err);
              }
              
              // Test Dependency:
              // The following message is used as part of E2E testing
              message.info('done queuing messages for document <%s>', docId);

              // send a last item to the queue to mark that
              // the processing of this document is done 
              var msg = {
                requestType: constants.queues.action.LAST_ITEM_TO_SCORE,
                data: {
                  sourceId: data.sourceId,
                  docId: docId  
                }
              };
              return worker.queueOut.sendMessage(msg, function (err) {
                if (err) return cb(err);
                  
                message.log('queued last item mark');
              
                // update document status to SCORING
                return db.updateDocumentStatus({
                    sourceId: sourceId,
                    docId: docId,
                    statusId: constants.documentStatus.SCORING
                  }, cb);  
              });
            });
            
            function processSentence(sentence, cb) {
              var message = {
                requestType: constants.queues.action.SCORE,
                data: {
                  sourceId: data.sourceId,
                  docId: docId,
                  sentenceIndex: sentence.index,
                  sentence: sentence.data.sentence,
                  mentions: sentence.data.mentions
                }
              };
                
              return worker.queueOut.sendMessage(message, function (err) {
                if (err) {
                  message.error('failed to queue message: <%s> of paper <%s>', message, docId);
                  return cb(err);
                }
                
                message.info('queued sentence sourceId: %s, docId: %s, index: %s', data.sourceId, sentence.index, docId);
                return cb();
              });
            }
        });
    });
  }
}

module.exports = {
    run: run
};