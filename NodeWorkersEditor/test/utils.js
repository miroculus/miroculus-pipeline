var fs = require('fs');
var lr = require('readline');

var azure = require('azure-storage');
var tedious = require('tedious');

function setEnvironmentVariables(setenvPath, log, cb) {
    log('Setting environment variables');
    var reader = lr.createInterface({
        input: fs.createReadStream(setenvPath)
    });
    
    reader.on('line', function (line) {
        if (line && line.toLowerCase().startsWith('set ')) {
            process.env[line.substring(4, line.indexOf('='))] = line.substring(line.indexOf('=') + 1);
            log(line);
        }
    });
    
    reader.on('close', function (line) {
        cb();
    });
}

function deleteCreateQueue(queueService, queueName, log, cb) {
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

function checkTableRowCount(sqlConfig, tableName, linesExpected, log, cb) {
    var connection = new tedious.Connection(sqlConfig);
    connection.on('connect', function (err) {
        // If no error, then good to proceed.
        log("Connected to DB");
        var request = new tedious.Request("SELECT COUNT(*) FROM " + tableName + ";", function (error) {
            if (error) return cb(error);
        });
        
        var result = "";
        request.on('row', function (columns) {
            var result = 0;
            if (columns && columns.length > 0 && columns[0].value) {
                result = parseInt(columns[0].value);
                if (isNaN(result)) result = 0;
            }
            
            if (result < linesExpected) {
                return cb(new Error('Not enough rows found in DB'));
            }
            return cb();
        });
        connection.execSql(request);
    });
}

function checkQueueMessageCount(queueService, queueName, count, log, cb) {
    return queueService.getQueueMetadata(queueName, function (error, data) {
        if (error) return cb(error);
        
        if (data && data.approximatemessagecount && parseInt(data.approximatemessagecount) === count) {
            return cb();
        }
    })
}

module.exports = {
    setEnvironmentVariables: setEnvironmentVariables,
    deleteCreateQueue: deleteCreateQueue,
    checkTableRowCount: checkTableRowCount,
    checkQueueMessageCount: checkQueueMessageCount
};