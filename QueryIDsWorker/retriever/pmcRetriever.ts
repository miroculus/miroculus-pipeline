import ncbi = require('./ncbiRequests');
import fs = require('fs');
import moment = require('moment');
import async = require('async');
    
var createDateContinuum = function (from: Date, to: Date): Array<Date> {
    var dates: Array<Date> = [];
    var lastDate = from;
    while (lastDate <= to) {
        dates.push(new Date(<any>lastDate));
        lastDate.setDate(lastDate.getDate() + 1);
    };
    return dates;
};
    
export interface IPapersData {
    papers: Array<any>;
}

export function getPapers(dateFrom: Date, dateTo: Date, doneCallback: (papersData: IPapersData) => void) {
    var dates = createDateContinuum(dateFrom, dateTo);
    var papersData = { papers: [] };

    var searchOnDate = (date, callback) => {
        var pdaTimeSpan = moment(date).format('"YYYY/MM/DD"<<>> : "YYYY/MM/DD"<<>>').replace(/<<>>/g, '[EDAT]');
        console.log("Searching for papers in " + pdaTimeSpan);
        ncbi.searchRequest('pmc', [pdaTimeSpan], 10000, 0, 'edat', -1, function (err, res, cache) {
            if (err) {
                console.error(err);
                callback(err);
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

    var asyncDoneCallback = () => {
        console.log("Finished scanning all dates");
        doneCallback(papersData);
    };

    async.eachSeries(dates, searchOnDate, asyncDoneCallback);
};
    
    
var checkPapers = function (date, paperIds, callback) {
    notProcessedPapers(paperIds, function (err, filteredPapers) {
        if (err) {
            console.error(err);
            return callback(err);
        };
        callback(null, filteredPapers);
    });

};
    
// Mock function, it needs to check if the paper is already
// proccessed.
var notProcessedPapers = function (paperIds, callback) {
    return callback(null, paperIds);
};
    
    
// Mock function, it needs to put the paperid in a queue to 
// be downloaded and proccesed
var enqueue = function (paperID) {
    console.log('enquee the pmc:', paperID);
};