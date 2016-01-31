var log = require("x-log");
var Q = require("q");
var moment = require("moment");
var service = require('./ncbiService.js');
var db = require('x-db');
var async = require('async');

var MAX_RESULTS = 10000;

function getDocumentContent(docId, source) {
    var deferred = Q.defer();

    service.fetchContent(source, docId, function (error, content) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(content);
        }
    });

    return deferred.promise;
}

function checkPapers(sourceId, docIds, callback) {
    
    db.getUnprocessedDocuments(docIds, sourceId, function (err, sourceId, filteredDocumentIds) {
        if (err) {
            log.error(err);
            return callback(err);
        }
        callback(null, sourceId, filteredDocumentIds);
    });
}

function getPapers(dateFrom, dateTo, callback) {
    var pdaTimeSpan = moment(dateFrom).format('"YYYY/MM/DD"') + '[EDAT] : ' + moment(dateTo).format('"YYYY/MM/DD"') + '[EDAT]';
    var papersData = { papers: [] };
    var foundErrors = false;

    function reviewReturnedResults(err, res, cache, resultCollection, callback) {

        // if there were any error in prior calls, do not keep processing
        // further requests.
        // callback will be called with the first error occurence
        if (foundErrors > 0) return;

        log.info('results return from db {} on dates {}', cache.database, pdaTimeSpan);
        
        if (err) {
            foundErrors = true;
            log.error(err);
            return callback(err);
        }
        
        // Needs to query further results
        resultCollection = resultCollection.concat(res.idlist);
        var resultCount = parseInt(res.retmax);
        var startIndex = parseInt(res.retstart);
        log.info('db {} on dates {} with current result count {}', cache.database, pdaTimeSpan, resultCollection.length);

        if (resultCount >= MAX_RESULTS) {
            log.info('Querying from db {} on dates {} with from index {}', cache.database, pdaTimeSpan, resultCount + startIndex);
            return createSearchRequest(cache.database, resultCount + startIndex, resultCollection, callback);
        }
            
        var sourceId = service.getDBId(cache.database);
        return checkPapers(sourceId, resultCollection, function (err, sourceId, papers) {
            if (err) {
                foundErrors = true;
                log.error(err);
                return callback(err);
            }
            
            var filteredDocuments = papers.map(function (paperId) {
                return {
                    docId: paperId,
                    sourceId: sourceId
                }                    
            });
            log.info('filtered {} documents on {}', filteredDocuments.length, cache.database);
            papersData.papers = papersData.papers.concat(filteredDocuments);
            return callback();
        });
    }
    
    function createSearchRequest(database, startIndex, resultCollection, callback) {
        service.searchRequest(database, [pdaTimeSpan], MAX_RESULTS, startIndex, service.etypes.edat, -1, function (err, res, cache) {
            reviewReturnedResults(err, res, cache, resultCollection, callback);
        });
    } 
    
    log.info("Searching for papers in " + pdaTimeSpan);
    
    // Calling get papers from both pmc and pubmed dbs
    return async.parallel([
        function (callback) {
            createSearchRequest(service.dbs.pmc, 0, [], callback);
        },
        function (callback) {
            createSearchRequest(service.dbs.pubmed, 0, [], callback);
        }
    ], function (err) {
        if (err) {
            log.error('Completed retreiving db new ids. There was a problem scanning the {}\nError:\n{}', pdaTimeSpan, err); 
            return callback(err); 
        }
        log.info('Completed retrieving db new ids on date span {}', pdaTimeSpan);
        return callback(null, papersData.papers);
    });
}

module.exports = {
    getDocumentContent: getDocumentContent,
    getPapers: getPapers
};