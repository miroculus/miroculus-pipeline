// TODO: rename x-service

var log = require("x-log");
var Q = require("q");
var moment = require("moment");
var service = require('./ncbiService.js');
var async = require('async');

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

var createDateContinuum = function (from, to) {
    var dates = [];
    var lastDate = from;
    
    while (lastDate <= to) {
        dates.push(new Date(lastDate));
        lastDate.setDate(lastDate.getDate() + 1);
    }
    return dates;
}

 // Mock function, it needs to check if the paper is already
// proccessed.
function notProcessedPapers (paperIds, callback) {
    return callback(null, paperIds);
}

function checkPapers(date, paperIds, callback) {
    
    return notProcessedPapers(paperIds, function (err, filteredPapers) {
        if (err) {
            console.error(err);
            return callback(err);
        }
        callback(null, filteredPapers);
    });
}

function getPapers(dateFrom, dateTo, doneCallback) {
    var dates = createDateContinuum(dateFrom, dateTo);
    var papersData = { papers: [] };
    var errors = [];
    
    function searchOnDate(date, callback) {
        var pdaTimeSpan = moment(date).format('"YYYY/MM/DD"<<>> : "YYYY/MM/DD"<<>>').replace(/<<>>/g, '[EDAT]');
        console.log("Searching for papers in " + pdaTimeSpan);
        return service.searchRequest(service.dbs.pmc, [pdaTimeSpan], 10000, 0, service.etypes.edat, -1, function (err, res, cache) {
            
            // In case there were errors, stop processing
            if (errors.length > 0) { return; }

            if (err) {
                console.error(err);
                errors.push(err);
                return callback(err);
            }
            
            return checkPapers(date, res.idlist, function (err, papers) {
                if (err) {
                    console.error(err);
                    errors.push(err);
                    callback(err);
                }
                
                papersData.papers = papersData.papers.concat(papers);
                callback();
            });
        });
    }
    
    function asyncDoneCallback() {
        console.log("Finished scanning all dates");
        
        if (errors.length > 0) {
            return doneCallback(new Error('There was an error querying on of the dates'));
        }
        return doneCallback(null, papersData);
    }
    
    return async.eachSeries(dates, searchOnDate, asyncDoneCallback);
}

module.exports = {
    getDocumentContent: getDocumentContent,
    getPapers: getPapers
};