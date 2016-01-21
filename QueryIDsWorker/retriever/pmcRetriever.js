var ncbi = require('./ncbiRequests.js');
var fs = require('fs');
var moment = require('moment');
var async = require('async');

var createDateContinuum = function (from, to) {
    var dates = [];
    var lastDate = from;
    
    while (lastDate <= to) {
        dates.push(new Date(lastDate));
        lastDate.setDate(lastDate.getDate() + 1);
    };
    return dates;
};

getPapers = function (dateFrom, dateTo, doneCallback) {
    var dates = createDateContinuum(dateFrom, dateTo);
    var papersData = { papers: [] };
    
    var searchOnDate = function (date, callback) {
        var pdaTimeSpan = moment(date).format('"YYYY/MM/DD"<<>> : "YYYY/MM/DD"<<>>').replace(/<<>>/g, '[EDAT]');
        console.log("Searching for papers in " + pdaTimeSpan);
        ncbi.searchRequest('pmc', [pdaTimeSpan], 10000, 0, 'edat', -1, function (err, res, cache) {
            if (err) {
                console.error(err);
                return callback(err);
            }
            
            checkPapers(date, res.idlist, function (err, papers) {
                if (err) {
                    console.error(err);
                    callback(err);
                };
                
                papersData.papers = papersData.papers.concat(papers);
                callback();
            });
        });
    };
    
    var asyncDoneCallback = function () {
        console.log("Finished scanning all dates");
        doneCallback(papersData);
    };
    
    async.eachSeries(dates, searchOnDate, asyncDoneCallback);
};


checkPapers = function (date, paperIds, callback) {
    
    notProcessedPapers(paperIds, function (err, filteredPapers) {
        if (err) {
            console.error(err);
            return callback(err);
        }
        callback(null, filteredPapers);
    });
};

// Mock function, it needs to check if the paper is already
// proccessed.
notProcessedPapers = function (paperIds, callback) {
    return callback(null, paperIds);
};


// Mock function, it needs to put the paperid in a queue to 
// be downloaded and proccesed
enqueue = function (paperID) {
    console.log('enquee the pmc:', paperID);
};

module.exports = {
    getPapers: getPapers,
    checkPapers: checkPapers,
    notProcessedPapers: notProcessedPapers,
    enqueue: enqueue
};