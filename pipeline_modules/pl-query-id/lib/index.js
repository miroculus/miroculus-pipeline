
var moment = require("moment");
var constants = require("pl-constants");
var config = require("pl-config");
var service = require("pl-docServiceProxy");
var db = require('pl-db');
var async = require("async");
var pipelineWorker = require('pl-worker');

function run(cb) {

 var worker = pipelineWorker.start({
      processMessage: processMessage,
      queueInName: config.queues.trigger_query,
      queueOutName: config.queues.new_ids
    },
    function(err) {
      if (err) return cb(err);
      console.info('worker initialized successfully');
  });
  
  function processMessage(message, cb) {
    var data = message && message.data || {};
    
    console.log('requestType', message.requestType);
    switch(message.requestType) {
      case (constants.queues.action.TRIGGER) :
        return trigger();
      case (constants.queues.action.REPROCESS) :
        return reprocess();
      default:
        console.error('message should not appear in this queue, deleting...', message);
        return cb();
    }

    function trigger() {
      return queryNewDocumentIds(data, function (err) {
        if (err) {
          console.error('error while processing trigger message', err);
          return cb(err);
        }
        return cb();
      });
      
      function queryNewDocumentIds(data, cb) {
        // Checking that a message returned from the queue
        // if no message was returned, the queue is empty
        var toDate = data.to ? moment(data.to) : moment();
        var fromDate = data.from ? moment(data.from) : moment().add(-3, 'days'); // TODO: change to 0 days (only today)
        console.info('getting papers from %s to %s', fromDate.format('YYYY-MM-DD'), toDate.format('YYYY-MM-DD'));
        
        // Run query for document in specific date
        return service.getPapers(fromDate.toDate(), toDate.toDate(), function (err, documents) {
          if (err) {
            console.error('There were several errors while retrieving the papers.');
            return cb(err);
          }
          
          if (!documents || !Array.isArray(documents)) {
            console.warning('Returned data is not an array');
            return cb();
          }
          
          console.info('Found %s new documents', documents.length);
          
          // Queue all new document ids
          async.each(documents, enqueueDocument, function (err) {
            if (err) {
              console.error('failed to queue messages for documents.');
              return cb(err);
            }
            
            // Test Dependency:
            // The following message is used as part of E2E testing
            console.info('done queuing messages for all documents');
            return cb();
          });
          
          return console.info('Completed iterating through retrieved documents, waiting for results to complete...');
        });
      }
    }
    
    function reprocess() {
      console.info('starting documents reprocessing request');
    
      // reprocess all sentences
      var rowCount = 0;
      return db.getDocuments({
          batchSize: config.sql.batchSize,
          rowHandler: rowHandler
        },
        function (err) { 
          if (err) {
            console.error('error while processing reprocessing message', err);
            return cb(err);
          }
          console.info('reprocessing request deleted from queue, %s documents sent for reprocessing', rowCount);
          return cb();
      });
      
      function rowHandler(row) {
        rowCount++;
        var doc = {
          docId: row.Id,
          sourceId: row.SourceId
        };
        return enqueueDocument(doc, function(err){
          if (err) return cb(err);
        });
      }
    }
    
    function enqueueDocument(doc, cb) {
      var message = {
        requestType: constants.queues.action.GET_DOCUMENT,
        data: {
          docId: doc.docId,
          sourceId: doc.sourceId
        }
      };
      
      return worker.queueOut.sendMessage(message, function (err) {
        if (err) {
          console.error('There was an error queuing a document.');
          return cb(err);
        }
        
        // Test Dependency:
        // The following message is used as part of E2E testing
        console.log('Queued document %s from source %s', doc.docId, doc.sourceId)
        return cb();
      });
    }
  }
}

module.exports = {
  run: run
};