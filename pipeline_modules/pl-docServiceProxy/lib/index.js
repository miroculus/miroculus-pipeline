var async = require('async');
var request = require('request');
var moment = require("moment");

var config = require("pl-config");
var db = require('pl-db');
var constants = require('pl-constants');

var service = require('./ncbiService');

var MAX_RESULTS = 10000;

var ERRORS = {
  NOT_ACCESSIBLE: 1
}

function getDocumentContent(docId, source, cb) {
    return service.fetchContent(source, docId, cb);
}

function getDocumentSentences(docId, sourceId, cb) {
    
  var source = constants.sourcesById[sourceId];
  var urlRequest = config.services.docServiceUrl + '/doc/' + source + '/' + docId;
  console.info('calling', urlRequest);

  var opts = {
      url: urlRequest,
      timeout: config.http.timeoutMsec
  };
  return request(opts, function(err, resp, body) {
    if (err) return cb(err);
    
    // TODO: this is a temporary code to 
    // handle unaccessible documents
    // asked Giovanny to return statusCode 401 so that 
    // we can check this instead of parsing the text
    if (body.indexOf('document not fetched') > 0) {
      var err = new Error('Document is not accessible');
      err.errorCode = ERRORS.NOT_ACCESSIBLE;
      return cb(err);
    }
          
    var sentencesArray;
    try {
        sentencesArray = JSON.parse(body);
    } catch (e) {
        console.error('error parsing sentences to JSON', body, e);
        return cb(e);
    }

    console.log('got response for doc', docId, body);
    
    if (!sentencesArray || !sentencesArray.sentences || !Array.isArray(sentencesArray.sentences)) {
      console.error('Returned JSON is not an array', body);
      return cb(new Error('Returned JSON is not an array'));
    }
    
    return cb(null, sentencesArray);
  });
}

function checkDocuments(docIds, cb) {
    
    var reqParams = { docs: docIds };
    db.getUnprocessedDocuments(reqParams, function (err, result) {
        if (err) {
            console.error(err);
            return cb(err);
        }
        return cb(null, result.docs);
    });
}

function getPapers(dateFrom, dateTo, cb) {
    var pdaTimeSpan = moment(dateFrom).format('"YYYY/MM/DD"') + '[EDAT] : ' + moment(dateTo).format('"YYYY/MM/DD"') + '[EDAT]';
    var allDocuments = { documents: [] };
    
    function runSearchRequest(database, startIndex, cb) {
        
        // Request Ids for specified page
        service.searchRequest(database, [pdaTimeSpan], MAX_RESULTS, startIndex, service.etypes.edat, -1, function (err, res, cache) {
            if (err) {
                console.error(err);
                return cb(err);
            }
            
            console.info('results return from db %s on dates %s', cache.database, pdaTimeSpan);
            
            // insert current result batch into array
            var sourceId = service.getDBId(cache.database);
            var documents = res.idlist.map(function (docId) {
                return {
                    sourceId: sourceId,
                    docId: docId + ''
                };
            });
            console.info('db %s on dates %s with result count %s', cache.database, pdaTimeSpan, documents.length);
            allDocuments.documents = allDocuments.documents.concat(documents);
            
            // We have more than one page and this is the first page
            var totalCount = parseInt(res.sount);
            var pageCount = parseInt(res.retmax);
            if (startIndex == 0 && pageCount < totalCount) {
                // Prepare start index for each page
                var pageStartIndexes = [];
                for (var i = pageCount; i < totalCount; i += MAX_RESULTS) {
                    pageStartIndexes.push(i);
                }
                
                // Request ids for each page start index 
                return async.each(pageStartIndexes, function (pageStartIndex, cb) {
                    return runSearchRequest(database, pageStartIndex, cb);
                }, cb);
            }
            
            return cb();
        });
    }
    
    console.info("Searching for documents in", pdaTimeSpan);
    
    // Calling get documents from both pmc and pubmed dbs
    return async.parallel([
        function (cb) {
            return runSearchRequest(service.dbs.pmc, 0, cb);
        }/*,
          * // For now, not querying pubmed db
        function (cb) {
            return runSearchRequest(service.dbs.pubmed, 0, cb);
        }*/
    ], function (err) {
        if (err) {
            console.error('Completed retrieving db new ids. There was a problem scanning the %s\nError:\n%s', pdaTimeSpan, err);
            return cb(err);
        }
        
        console.info('Completed retrieving db new ids on date span %s. Filtering only new ids...', pdaTimeSpan);
        
        return checkDocuments(allDocuments.documents, function (err, documents) {
            if (err) {
                console.error(err);
                return cb(err);
            }
            
            console.info('filtered %s documents', documents.length);
            return cb(null, documents);
        });
    });
}

module.exports = {
    ERRORS: ERRORS,
    getDocumentContent: getDocumentContent,
    getDocumentSentences: getDocumentSentences,
    getPapers: getPapers
};