var fs = require('fs');
var lr = require('readline');

var azure = require('azure-storage');
var tedious = require('tedious');
var Connection = tedious.Connection;
var ConnectionPool = require('tedious-connection-pool');

var logger = require('azure-logging');
var log = require('x-log');

var pool;

// Ensure DB connection pool object is initialized (singleton)
function initDB() {
  
  if (pool) return;
  
  var configSql = require('x-config').sql;
  
  // TODO: move to configuration
  var poolConfig = {
    min: 2,
    max: 5,
    idleTimeout: 10000,
    log: false
  };
  console.info("sql config", configSql);
  pool = new ConnectionPool(poolConfig, configSql);
  pool.on('error', function (err) {
    console.warn('error connecting to sql', err);
  });
}

// Request a new connection from the connection pool
function connect(cb) {
  return pool.acquire(cb);
}

function getReleaseCallback(connection, cb) {
  return function () {
    connection.release();
    return cb.apply(null, arguments);
  }
}

function logErrorReleaseConnection(err, connection, cb) {
  console.error('error:', err);
  console.log('releasing connection');
  if (connection) connection.release();
  return cb(err);
}

// Read environment variable settings file, and set all relevant variables in current process
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

// Send a delete request for azure queue, and wait until creation is enabled and perform it
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

function getTableRowCount(tableName, where, cb) {
  
  initDB();
  
  return connect(function (err, connection) {
    if (err) return logErrorReleaseConnection(err, connection, cb);
    
    // If no error, then good to proceed.
    var query = "SELECT COUNT(*) FROM " + tableName + (where ? " WHERE " + where : "") + ";";
    var request = new tedious.Request(query, getReleaseCallback(connection, function (error) {
      if (error) return cb(error);
    }));
    
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

// Wait for table row count to reach a minimum of an expected count
// options: { tableName: string, where: string, expectedCount: number }
function waitForTableRowCount(options, cb) {
  
  setTimeout(function () {
    return getTableRowCount(options.tableName, options.where, function (error, count) {
      if (error) return cb(error);
      
      if (count < options.expectedCount) return waitForTableRowCount(options, cb);
      
      return cb();
    });
        
  }, 5000);
}

function runDBScript(dbScript, cb) {
  
  initDB();
  
  // Notice: this script will not run with complex scripts like DB creation or 
  // scripts with GO statements
  var dbScriptSQL = fs.readFileSync(dbScript, 'utf8');
  
  return connect(function (err, connection) {
    if (err) return logErrorReleaseConnection(err, connection, cb);
    
    var request = new tedious.Request(dbScriptSQL, getReleaseCallback(connection, function (error) {
      if (error) return cb(error);
      
      return cb();
    }));
    connection.execSql(request);
  });
}

function countLogMessages(options, cb) {
  
  // output format (text | html | json)
  options.format = 'json';
  options.nocolors = true;
  
  // maximum level ('log' < 'info' < 'warn' < 'error')
  options.level = options.level || 'info';
  options.farm = options.farm || process.env.COMPUTERNAME || '';
  options.limit = options.limit || '100';
  options.top = options.top || '100';
  options.transporters = require('x-config').log.transporters;
  
  return logger.reader(options, function (error, r) {
    if (error) return cb(error);
    
    var results = [];
    r.on('line', function (data) { results.push(data); });
    r.on('end', function () {
      return cb(null, results.length);
    });
    r.on('error', cb);
  });
}

function waitForLogMessage(options, cb) {
  
  return setTimeout(function () {
    return countLogMessages(options, function (error, count) {
      if (error) return cb(error);
      
      if (count == 0) return waitForLogMessage(options, cb);
      
      return cb();
    });
        
  }, 5000);
}

function checkForErrorsInLog(since, cb) {
  
  return setTimeout(function () {
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
      
      return checkForErrorsInLog(since, cb);
    });
  }, 5000);
}

module.exports = {
  setEnvironmentVariables: setEnvironmentVariables,
  deleteCreateQueue: deleteCreateQueue,
  getTableRowCount: getTableRowCount,
  waitForTableRowCount: waitForTableRowCount,
  runDBScript: runDBScript,
  waitForLogMessage: waitForLogMessage,
  countLogMessages: countLogMessages,
  checkForErrorsInLog: checkForErrorsInLog,
};