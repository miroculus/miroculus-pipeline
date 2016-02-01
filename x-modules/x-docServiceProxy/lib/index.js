var log = require("x-log");
var Q = require("q");
var moment = require("moment");
var service = require('./ncbiService.js');
var db = require('x-db');
var async = require('async');

var MAX_RESULTS = 10000;

function getDocumentContent(docId, source, cb) {
    return service.fetchContent(source, docId, cb);
}

function checkDocuments(docIds, callback) {
    
    var reqParams = { docs: docIds };
    db.getUnprocessedDocuments(reqParams, function (err, result) {
        if (err) {
            log.error(err);
            return callback(err);
        }
        callback(null, result.docs);
    });
}

function getPapers(dateFrom, dateTo, callback) {
    var pdaTimeSpan = moment(dateFrom).format('"YYYY/MM/DD"') + '[EDAT] : ' + moment(dateTo).format('"YYYY/MM/DD"') + '[EDAT]';
    var allDocuments = { documents: [] }; 
    
    function runSearchRequest(database, startIndex, callback) {

        // Request Ids for specified page
        service.searchRequest(database, [pdaTimeSpan], MAX_RESULTS, startIndex, service.etypes.edat, -1, function (err, res, cache) {

            log.info('results return from db {} on dates {}', cache.database, pdaTimeSpan);
        
            if (err) {
                log.error(err);
                return callback(err);
            }

            // insert current result batch into array
            var sourceId = service.getDBId(cache.database);
            var documents = res.idlist.map(function (docId) {
                return {
                    sourceId: sourceId,
                    docId: docId +''
                };
            });
            log.info('db {} on dates {} with result count {}', cache.database, pdaTimeSpan, documents.length);
            allDocuments.documents = allDocuments.documents.concat(documents);
            
            // We have more than one page and this is the first page
            var totalCount = parseInt(res.sount);
            var pageCount = parseInt(res.retmax);
            if (startIndex == 0 && pageCount < totalCount)
            {
                // Prepare start index for each page
                var pageStartIndexes = [];
                for (var i = pageCount; i < totalCount; i += MAX_RESULTS) {
                    pageStartIndexes.push(i);
                }
                
                // Request ids for each page start index 
                return async.each(pageStartIndexes, function (pageStartIndex, callback) {
                    return runSearchRequest(database, pageStartIndex, callback);
                }, callback);
            }
            
            return callback();
        });
    }
    
    log.info("Searching for documents in " + pdaTimeSpan);
    
    // Calling get documents from both pmc and pubmed dbs
    return async.parallel([
        function (callback) {
            return runSearchRequest(service.dbs.pmc, 0, callback);
        },
        function (callback) {
            return runSearchRequest(service.dbs.pubmed, 0, callback);
        }
    ], function (err) {
        
        if (err) {
            log.error('Completed retreiving db new ids. There was a problem scanning the {}\nError:\n{}', pdaTimeSpan, err); 
            return callback(err); 
        }
        
        log.info('Completed retrieving db new ids on date span {}. Filtering only new ids...', pdaTimeSpan);
        
        return checkDocuments(allDocuments.documents, function (err, documents) {
            if (err) {
                log.error(err);
                return callback(err);
            }
            
            log.info('filtered {} documents', documents.length);
            return callback(null, documents);
        });
    });
}

module.exports = {
    getDocumentContent: getDocumentContent,
    getPapers: getPapers
};