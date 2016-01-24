var moment = require('moment');
var retriever = require('./ncbiServiceWrapper.js');
var queue = require("../queue");

var common = require("../common");
var config = require("../config");
var log = common.log;

var papersHandler = (function () {
    "use strict";

    var queueOut = new queue.QueueHandler(config.queue.new_ids, config.storage);
    // Todo: This property should be changes to make a check with DB
    var _tempIDCache = {};
    
    var getPapers = function () {
        var toDate = moment();
        var fromDate = moment().add(-3, 'days');
        log.info('getting papers from {} to {}', fromDate.format('YYYY-MM-DD'), toDate.format('YYYY-MM-DD'));
        
        // Run query for paperts in specific date
        retriever.getPapers(fromDate.toDate(), toDate.toDate(), function (papersData) {
            if (papersData) {
                var papers = papersData.papers;
                
                if (Array.isArray(papers)) {
                    log.info('Found {} new documents', papers.length);
                    
                    // Enqueuing each document as a pending request for processing
                    papers.forEach(function (paperId) {
                        
                        if (_tempIDCache[paperId]) { return; }

                        log.info('Enqueuing request for document with id: <{}>', paperId);

                        queueOut.sendMessage({
                            "requestType": "getDocument",
                            "properties": {
                                "documentId": paperId,
                                "documentSource": "pmc"
                            }
                        }).then(function (obj) {
                            _tempIDCache[paperId] = true;
                            return log.info('enqueued: <{}>', obj);

                        }).catch(function (r) {
                            return log.error('failed to enqueu message: <{}>', r);

                        }).finally(function () {
                            return log.info('done sending.....');

                        });
                    });
                    return log.info('Completed itterating through retrieved documents');
                } else {
                    return log.error('Returned data is not an array');
                }
            } else {
                return log.error('No data was returned when quering for new papers');
            }
        });
    };

    return getPapers;
}());

exports.getPapers = papersHandler;