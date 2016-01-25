var moment = require('moment');
var retriever = require('./ncbiServiceWrapper.js');
var queue = require("../queue");
var constants = require('../constants.json');

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
        retriever.getPapers(fromDate.toDate(), toDate.toDate(), function (errors, papersData) {
            
            if (errors && errors.length > 0) {
                log.error('There were several errors while retreiving the papers.');
            }

            if (!papersData) { return log.error('No data was returned when quering for new papers'); }

            var papers = papersData.papers;
            if (!Array.isArray(papers)) { return log.error('Returned data is not an array'); }

            log.info('Found {} new documents', papers.length);
                    
            // Enqueuing each document as a pending request for processing
            papers.forEach(function (paperId) {
                        
                if (_tempIDCache[paperId]) { return; }

                log.info('Enqueuing request for document with id: <{}>', paperId);
                
                var queueProps = constants.queue.props;
                var new_ids_props = constants.queue.new_ids_props;
                var messageParams = {};
                messageParams[queueProps.requestType] = constants.queue.requests.getDocument;
                messageParams[queueProps.properties] = {};
                messageParams[queueProps.properties][new_ids_props.id] = paperId;
                messageParams[queueProps.properties][new_ids_props.source] = new_ids_props.pmcSource;

                queueOut.sendMessage(messageParams).then(function (obj) {
                    _tempIDCache[paperId] = true;
                    return log.info('enqueued: <{}>', obj);

                }).catch(function (err) {
                    return log.error('failed to enqueu message: <{}>', err);

                }).finally(function () {
                    return log.info('done sending.....');

                });
            });
            return log.info('Completed itterating through retrieved documents');
        });
    };

    return getPapers;
}());

exports.getPapers = papersHandler;