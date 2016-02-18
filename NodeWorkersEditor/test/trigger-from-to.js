var assert = require('assert');
var fs = require('fs');
var lr = require('readline');
var async = require('async');
var exec = require('child_process').exec;

var moment = require('moment');
var azure = require('azure-storage');
var tedious = require('tedious');

var log = require('x-log');
var utils = require('./utils.js');

var DATE_TO_CHECK = '2007-10-10';
var DOCUMENT_ID_TO_MONITOR = '2000354';

// TODO:
// move major method into separate file
// use before \ after for setup and cleanup
// use describe

var config;
var queueService;

var time = moment();
var solutionRelativePath = '..\\';

describe('Whole Pipeline', function () {
    
    this.timeout(15 * 60 * 1000); // 10 minute timeout
    
    // Initializing environment
    it('Processing and Scoring', function (done) {
        
        async.series([

            // Setting environment variables
            function (cb) {
                utils.setEnvironmentVariables(solutionRelativePath + 'setenv.test.cmd', function (error) {
                    
                    if (error) return cb(error);
                    
                    config = require('x-config');
                    return cb();
                });
            },

            // Initialize log
            function (cb) {
                log.init({
                    domain: process.env.COMPUTERNAME || '',
                    instanceId: log.getInstanceId(),
                    app: 'ci-testing',
                    level: config.log.level,
                    transporters: config.log.transporters
                }, cb);
            },

            // Initializing config and queue service
            function (cb) {
                queueService = azure.createQueueService(config.storage.account, config.storage.key)
                    .withFilter(new azure.ExponentialRetryPolicyFilter());
                return cb();
            },

            // Empty database schema from data
            function (cb) {
                var emptyScript = solutionRelativePath + 'Sql\\emptytables.sql';
                utils.runDBScript(emptyScript, cb);
            },

            // Recreate queues
            function (cb) {
                async.parallel([
                    function (cb) {
                        return utils.deleteCreateQueue(queueService, config.queues.trigger_query, cb);
                    },
                    function (cb) {
                        return utils.deleteCreateQueue(queueService, config.queues.new_ids, cb);
                    },
                    function (cb) {
                        return utils.deleteCreateQueue(queueService, config.queues.scoring, cb);
                    }
                ], cb);
            },

            // Trigger a new happy flow
            function (cb) {
                
                // After recreating all queues, trigger a pipeline happy flow
                console.info('listening on queue', config.queues.trigger_query);
                    
                var message = {
                    "requestType": "trigger",
                    "data": {
                        "fromDate": DATE_TO_CHECK,
                        "toDate": DATE_TO_CHECK
                    }
                };
                queueService.createMessage(config.queues.trigger_query, JSON.stringify(message), function (error) {
                    if (error) return cb(error);
                    console.info('trigger message successfully on ' + DATE_TO_CHECK);
                    cb();
                });

            }
        ], function (error) {
            
            if (error) return done(error);
            done();
            
            // Running query ID worker from Query ID folder
            console.info('starting worker query id');
            var commands = 'cd ' + solutionRelativePath + ' & run.cmd setenv.test.cmd';
            
            var child = exec(commands);
            
            child.stderr.on('data', function (error) {
                console.info("Error: " + error);
                return done(error);
            });
            
            child.on('close', function (code) {
                console.info('closing code: ' + code);
                return done(code);
            });

            async.parallel([
                
                // Check for proper log lines
                function (cb) {
                    utils.waitForLogMessage({
                        message: 'done queuing messages for all documents', 
                        app: 'doc-query',
                        since: time
                    }, function (error) {
                        if (error) return cb(error);
                        
                        // Check for specific document in DB
                        utils.countLogMessages({
                            message: 'Queued document ' + DOCUMENT_ID_TO_MONITOR,
                            app: 'doc-query',
                            since: time
                        }, function (error, count) {
                            if (error) return cb(error);
                            
                            if (count == 0) {
                                var docError = new Error('could not find document ' + DOCUMENT_ID_TO_MONITOR + ' in log');
                                console.error(docError)
                                return cb(docError);
                            }
                            
                            return cb();
                        })
                    })
                },

                // Periodic check that document was parsed for sentences
                function (cb) {
                    
                    utils.waitForLogMessage({
                        message: 'done queuing messages for document <' + DOCUMENT_ID_TO_MONITOR + '>', 
                        app: 'paper-parser',
                        since: time
                    }, function (error) {
                        if (error) return done(error);
                        
                        // Check DB has appropriate document
                        utils.checkTableRowCount('Documents', 'Id=' + DOCUMENT_ID_TO_MONITOR, function (error, count) {
                            if (error) return done(error);
                            
                            if (count == 0) {
                                var countError = new Error('could not find document ' + DOCUMENT_ID_TO_MONITOR + ' in DB');
                                console.error(countError);
                                return done(countError);
                            }
                            
                            return done();
                        })
                    });
                },

                // Periodic check that all sentences were
                function (cb) {
                    
                    utils.waitForLogMessage({
                        message: 'done queuing messages for document <' + DOCUMENT_ID_TO_MONITOR + '>', 
                        app: 'paper-parser',
                        since: time
                    }, function (error) {
                        if (error) return done(error);
                        
                        // Check DB has appropriate document
                        utils.checkTableRowCount('Documents', 'Id=' + DOCUMENT_ID_TO_MONITOR, function (error, count) {
                            if (error) return done(error);
                            
                            if (count == 0) {
                                var countError = new Error('could not find document ' + DOCUMENT_ID_TO_MONITOR + ' in DB');
                                console.error(countError);
                                return done(countError);
                            }
                            
                            return done();
                        })
                    });
                }

            ], function (error) {

                if (error) return done(error);
                
                // Cleanup
                queueService.deleteQueueIfExists(config.queues.trigger_query, function () { });
                queueService.deleteQueueIfExists(config.queues.new_ids, function () { });
                queueService.deleteQueueIfExists(config.queues.scoring, function () { });
                
                console.info('killing process', child.pid);
                process.kill(pid);
                
                done();
            });

        });

    });

    //it('Query ID worker test', function (done) {
        
    //    // Running query ID worker from Query ID folder
    //    console.info('starting worker query id');
    //    var commands = 'cd ' + solutionRelativePath + 'QueryIDs & run.cmd ..\\setenv.test.cmd';
        
    //    var child = exec(commands);
    //    processIDs.push(child.pid);
        
    //    child.stderr.on('data', function (error) {
    //        console.info("Error: " + error);
    //        return done(error);
    //    });
        
    //    child.on('close', function (code) {
    //        console.info('closing code: ' + code);
    //        return done(code);
    //    });
        
        
    //});
    
    //it('Doc parser worker test', function (done) {
        
    //    // Running query ID worker from Query ID folder
    //    console.info('starting worker doc parser');
    //    var commands = 'cd ' + solutionRelativePath + 'DocParser & run.cmd ..\\setenv.test.cmd';
        
    //    var child = exec(commands);
    //    processIDs.push(child.pid);

    //    child.stderr.on('data', function (error) {
    //        console.info("Error: " + error);
    //        return done(error);
    //    });
        
    //    child.on('close', function (code) {
    //        console.info('closing code: ' + code);
    //        return done(code);
    //    });
        
    //});
})
