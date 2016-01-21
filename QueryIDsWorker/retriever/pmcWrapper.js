var moment = require('moment');
var retriever = require('./pmcRetriever.js');
var queue = require("../queue");

var common = require("../common")
var queueOut = new queue(common.config.queue.new_ids, common.config.storage);


function getPapers() {
    var toDate = moment();
    var fromDate = moment().add(-3, 'days');
    console.log('getting papers from ' + fromDate.format('YYYY-MM-DD') + ' to ' + toDate.format('YYYY-MM-DD'));

    // processing commands, then ...        
    retriever.getPapers(fromDate.toDate(), toDate.toDate(), function (papersData) {
        if (papersData) {
            var papers = papersData.papers;
            if (Array.isArray(papers)) {
                console.log('Found ' + papers.length + ' new documents');
                papers.forEach(function (paperId) {
                    console.log('Sending request for document with id: ' + paperId);
                    queueOut.sendMessage({
                        "requestType": "getDocument",
                        "properties": {
                            "documentId": paperId,
                            "documentSource": "pmc"
                        }
                    })
                        .then(function (obj) {
                        return console.log('enqueued');
                    })
                        .catch(function (r) {
                        return console.error('failed here', r);
                    })
                        .finally(function () {
                        return console.log('done sending.....');
                    });
                });
                return console.log('Completed itterating through retrieved documents');
            }
            else {
                return console.error('Returned data is not an array');
            }
        }
        else {
            return console.error('error occured:');
        }
    });
}

exports.getPapers = getPapers;