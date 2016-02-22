﻿var fs = require('fs');
var lr = require('readline');

var azure = require('azure-storage');
var tedious = require('tedious');
var Connection = tedious.Connection;
var ConnectionPool = require('tedious-connection-pool');

var logger = require('azure-logging');
var log = require('x-log');

var pool;

function init() {
    
    if (pool) return;

    var configSql = require('x-config').sql;
    
    // TODO: move to configuration
    var poolConfig = {
        min: 2,
        max: 5,
        idleTimeout: 10000,
        log: false
    };
    
    pool = new ConnectionPool(poolConfig, configSql);
    pool.on('error', function (err) {
        console.error('error connecting to sql', err);
    });
}

function connect(cb) {
    return pool.acquire(cb);
}

function setEnvironmentVariables(setenvPath, cb) {
    var reader = lr.createInterface({
        input: fs.createReadStream(setenvPath)
    });
    
    reader.on('line', function (line) {
        if (line && line.toLowerCase().startsWith('set ')) {
            process.env[line.substring(4, line.indexOf('='))] = line.substring(line.indexOf('=') + 1);
        }
    });
    
    reader.on('close', function (line) {
        cb();
    });
}

function deleteCreateQueue(queueService, queueName, cb) {
    return queueService.deleteQueueIfExists(queueName, function (error) {
        if (error) return cb(error);
        
        var retries = 20;
        
        return createQueuePendingDeletion(queueName, cb);

        // When deleting a queue, it takes a while for the queue to actually be deleted.
        // This method helps retry until the deletion is done
        function createQueuePendingDeletion(queueName, cb) {
            return queueService.createQueueIfNotExists(queueName, function (error) {
                
                if (error && error.code == 'QueueBeingDeleted' && retries > 0) {
                    retries--;
                    return setTimeout(function () {
                        createQueuePendingDeletion(queueName, cb);
                    }, 1000);
                }
                
                if (error) return cb(error);
                
                cb();
            });
        }
    });
}

function checkTableRowCount(tableName, where, cb) {
    
    init();
    
    return connect(function (err, connection) {
        if (err) return console.error(err, connection, cb);

        // If no error, then good to proceed.
        console.info("Connected to DB");
        var query = "SELECT COUNT(*) FROM " + tableName + (where ? " WHERE " + where : "") + ";";
        var request = new tedious.Request(query, function (error) {
            if (error) return cb(error);
        });
        
        request.on('row', function (columns) {
            var result = 0;
            if (columns && columns.length > 0 && columns[0].value) {
                result = parseInt(columns[0].value);
                if (isNaN(result)) result = 0;
            }
            
            return cb(null, result);
        });
        request.on('error', cb);
        
        connection.execSql(request);
    });
}

function waitForTableRowCount(options, cb) {
    
    setTimeout(function () {
        return checkTableRowCount(options.tableName, options.where, function (error, count) {
            if (error) return cb(error);
            
            if (count < options.expectedCount) return waitForTableRowCount(options, cb);
            
            return cb();
        });
        
    }, 5000);
}

function checkQueueMessageCount(queueService, queueName, count, cb) {
    return queueService.getQueueMetadata(queueName, function (error, data) {
        if (error) return cb(error);
        
        if (data && data.approximatemessagecount && parseInt(data.approximatemessagecount) === count) {
            return cb();
        }
    })
}

function runDBScript(dbScript, cb) {
    
    init();
    
    // Notice: this script will not run with complex scripts like DB creation or 
    // scripts with GO statements
    var dbScriptSQL = fs.readFileSync(dbScript, 'utf8');
    
    return connect(function (err, connection) {
        if (err) return console.error(err, connection, cb);

        var request = new tedious.Request(dbScriptSQL, function (error) {
            if (error) return cb(error);
            
            return cb();
        });
        connection.execSql(request);
    });
}

function countLogMessages(options, cb) {

    // output format (text | html | json)
    options.format = 'json';
    options.nocolors = true;
    
    // maximum level ('log' < 'info' < 'warn' < 'error')
    options.level = options.level || 'info';
    options.farm = options.farm || 'MORSHE-X1';
    options.limit = options.limit || '100';
    options.top = options.top || '100';
    options.transporters = require('x-config').log.transporters;
    
    // This doesn't work now, need to wait for work
    //options.since = "Wed Feb 17 2016 16:24:08 GMT+0200 (Jerusalem Standard Time)"
    
    logger.reader(options, function (error, r) {
        if (error) return cb(error);
            
        var results = [];
        r.on('line', function (data) { results.push(data); });
        r.on('end', function () {
                
            // TODO:
            // when 'since' option works, remove this code
            var sinceResults = results.filter(function (result) {
                return result.meta.time >= options.since
            });
                
            return cb(null, sinceResults.length);
        });
        r.on('error', cb);
    });
}

function waitForLogMessage(options, cb) {
    
    setTimeout(function () {
        return countLogMessages(options, function (error, count) {
            if (error) return cb(error);

            if (count == 0) return waitForLogMessage(options, cb);

            return cb();
        });
        
    }, 5000);
}

function checkForErrorsInLog(since, cb) {
    
    setTimeout(function () {
        countLogMessages({
            app: 'ci-testing',
            level: 'error',
            since: since
        }, function (error, count) {
            if (error) return cb(error);
            
            if (count > 0) {
                var countError = new Error('Found errors through the log in the pipeline');
                console.error(countError);
                return cb(countError);
            }

            return checkForErrorsInLog(since);
        });
    }, 5000);
}

module.exports = {
    setEnvironmentVariables: setEnvironmentVariables,
    deleteCreateQueue: deleteCreateQueue,
    checkTableRowCount: checkTableRowCount,
    waitForTableRowCount: waitForTableRowCount,
    checkQueueMessageCount: checkQueueMessageCount,
    runDBScript: runDBScript,
    waitForLogMessage: waitForLogMessage,
    countLogMessages: countLogMessages,
    checkForErrorsInLog: checkForErrorsInLog,
};