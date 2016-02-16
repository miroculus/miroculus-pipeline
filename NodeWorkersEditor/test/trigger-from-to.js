var assert = require('assert');
var fs = require('fs');
var lr = require('readline');
var async = require('async');
var exec = require('child_process').exec;

var moment = require('moment');
var azure = require('azure-storage');
var tedious = require('tedious');

var utils = require('./utils.js');

var DATE_TO_CHECK = '2015-01-05';
var LINES_EXPECTED = 143;

var child;

// TODO:
// move major method into separate file
// use before \ after for setup and cleanup
// use describe

var config;
var queueService;

var date = moment();
var logFileName = __dirname + '\\' + date.format('YYYY-MM-DD_hh-mm-ss') + '.log';
var testFileName = __dirname + '\\' + date.format('YYYY-MM-DD_hh-mm-ss') + '.test.log';
var relativePath = '..\\';
console.log('logging to:');
console.log(logFileName);
console.log(testFileName);

function log(msg) {
    fs.appendFile(testFileName, msg);
    fs.appendFile(testFileName, '\n');
}

describe('Whole Pipeline', function () {
    
    this.timeout(5 * 60 * 1000); // 5 minute timeout
        
    it('Suite Initialization', function (done) {
        
        async.series([

            // Setting environment variables
            function (cb) {
                utils.setEnvironmentVariables(relativePath + 'setenv.test.cmd', log, cb);
            }, 

            // Initializing config and queue service
            function (cb) {
                config = require('x-config');
                queueService = azure.createQueueService(config.storage.account, config.storage.key)
                    .withFilter(new azure.ExponentialRetryPolicyFilter());
                return cb();
            },
            function (cb) {                

                return utils.deleteCreateQueue(queueService, config.queues.trigger_query, log, function (error) {
                    if (error) return cb(error);
                    
                    log('listening on queue', config.queues.trigger_query);
                    
                    var message = {
                        "requestType": "trigger",
                        "data": {
                            "fromDate": DATE_TO_CHECK,
                            "toDate": DATE_TO_CHECK
                        }
                    };
                    queueService.createMessage(config.queues.trigger_query, JSON.stringify(message), function (error) {
                        if (error) return cb(error);
                        log('trigger message successfully on ' + DATE_TO_CHECK);
                        cb();
                    });
                });

            }
        ], function (error) {
            done(error);
        });

    });

    it('Query ID worker test', function (done) {
        
        var commands = 'cd ' + relativePath + 'QueryIDs & run.cmd ..\\setenv.test.cmd >> ' + logFileName;
        
        child = exec(commands);
        
        child.stdout.on('data', function (data) {
            process.stdout.write(".");
        });
        
        child.stderr.on('data', function (data) {
            console.error(data);
            done(data);
        });
        
        child.on('close', function (code) {
            log('closing code: ' + code);
            setTimeout(function () {
                return done(code);
            }, 1000);
        });
        
        // Periodic check if trigger queue is empty
        var interval = setInterval(function () {
            queueService.getQueueMetadata(config.queues.trigger_query, function (error, data) {
                if (error) return done(error);
                
                if (data && data.approximatemessagecount && parseInt(data.approximatemessagecount) === 0) {
                    clearInterval(interval);
                    
                    return utils.checkTableRowCount(config.sql, 'Documents', 143, log, done);
                }
            })
        }, 5 * 1000);
    });

    it('Suite Cleanup', function () {
        assert.doesNotThrow(function () {
            queueService.deleteQueueIfExists(config.queues.trigger_query, function () { });
        }, 'fail to delete trigger queue');
        assert.doesNotThrow(function () {
            process.kill(child.pid);
        }, 'fail to kill child process');
    })
})
