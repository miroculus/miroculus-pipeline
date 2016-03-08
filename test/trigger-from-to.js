var async = require('async');
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;

var moment = require('moment');
var azure = require('azure-storage');

var log = require('x-log');
var utils = require('./utils.js');

var DATE_TO_CHECK = '2007-10-10';
var DOCUMENT_ID_TO_MONITOR = '2000354';

var config;
var queueService;
var workers = [];
var logMessages = [];

var startTime = moment();

// This method helps print any left over errors to the console before the process ends
function doneWithError(err, done) {
  console.error('The test failed with the following error:', err);
  
  return setTimeout(function () {
    return done(err);
  }, 500);
}

// This method helps print any left over messages to the console before the process ends
function doneSuccessfully(done) {
  return setTimeout(function () {
    return done();
  }, 500);
}

describe('Whole Pipeline', function () {
  
  this.timeout(15 * 60 * 1000); // 15 minute timeout
  
  before(function (done) {
    
    console.info('Setting up environment...');
    async.series([

      // Setting environment variables
      function (cb) {
        
        var setEnvPath = path.join(__dirname, '..', 'setenv.test.cmd');
        
        // set env script should only appear in local environments (not in CI environments)
        if (!fs.existsSync(setEnvPath)) {
          // TODO:
          // Add to fix method for all environment variables
          process.env.DB_PASSWORD = process.env.DB_PASSWORD.replace(/_DOLLAR_/g, '$'); // travis jumbles up $ signs
          config = require('x-config');
          return cb();
        }
        
        utils.setEnvironmentVariables(setEnvPath, function (error) {
          
          if (error) return cb(error);
          
          // Loading config now that the environment variables have been loaded
          config = require('x-config');
          return cb();
        });
      },

      // Initialize log
      function (cb) {
        
        var domain = process.env.COMPUTERNAME || '';
        var instance = log.getInstanceId();
        console.info('Logging for domain', domain, 'on instance', instance);
        
        return log.init({
          domain: domain,
          instanceId: instance,
          app: 'ci-testing',
          level: config.log.level,
          transporters: config.log.transporters
        }, cb);
      },

      // Initializing queue service
      function (cb) {
        queueService = azure.createQueueService(config.storage.account, config.storage.key)
            .withFilter(new azure.ExponentialRetryPolicyFilter());
        return cb();
      },

      // Recreate database schema
      function (cb) {
        var dropScript = path.join(__dirname, '..', 'deployment', 'sql', 'dropschema.sql');
        var schemaScript = path.join(__dirname, '..', 'deployment', 'sql', 'schema.sql');
        var setupScript = path.join(__dirname, '..', 'deployment', 'sql', 'testsetup.sql');
        
        if (!fs.existsSync(dropScript)) return cb(new Error('Drop DB schema script not found in', dropScript));
        if (!fs.existsSync(schemaScript)) return cb(new Error('Create DB schema script not found in', schemaScript));
        if (!fs.existsSync(setupScript)) return cb(new Error('Setup DB script not found in', setupScript));
        
        console.info('Setting up DB schema');
        return utils.runDBScript(dropScript, function (err) {
          if (err) {
            console.error('Error running empty db schema:', err);
            return cb(err);
          }
          
          return utils.runDBScript(schemaScript, function (err) {
            if (err) {
              console.error('Error running create db schema:', err);
              return cb(err);
            }
            
            return utils.runDBScript(setupScript, function (err) {
              if (err) {
                console.error('Error running setup db:', err);
                return cb(err);
              }
              
              console.info('DB schema was recreated successfully');
              return cb();
            });
          });

        });
      },

      // Recreate queues in pipeline
      function (cb) {
        return async.parallel([
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

      // Starting all three workers in pipeline
      function (cb) {
        
        // If one of the workers throws an error, log the error message
        var runAppJSPath = path.join(__dirname, '..', 'webjob', 'app.js');
        var queryWorker = exec('set PIPELINE_ROLE=query-id&& set WORKERS=1&& node ' + runAppJSPath, function (err, stdout, stderr) {
          if (err) return console.error('Error in Query worker', err);
        });
        var parserWorker = exec('set PIPELINE_ROLE=paper-parser&& set WORKERS=1&& node ' + runAppJSPath, function (err, stdout, stderr) {
          if (err) return console.error('Error in Parser worker', err);
        });
        var scorerWorker = exec('set PIPELINE_ROLE=scoring&& set WORKERS=1&& node ' + runAppJSPath, function (err, stdout, stderr) {
          if (err) return console.error('Error in Scorer worker', err);
        });
        
        workers.push(queryWorker);
        workers.push(parserWorker);
        workers.push(scorerWorker);
        
        // If one of the workers close, it logs an error message which will
        // be monitored by the tests and cause failure
        queryWorker.on('close', function (code) {
          console.error('Query ID worker closing code: ' + code);
        });
        parserWorker.on('close', function (code) {
          console.error('Parser worker closing code: ' + code);
        });
        scorerWorker.on('close', function (code) {
          console.error('Scorer worker closing code: ' + code);
        });
        
        return cb();
      }
    ], function (err) {
      
      if (err) return doneWithError(err, done);
      
      console.info('Setup was completed successfully');
      return doneSuccessfully(done);
    });

  });
  
  // Testing happy flow
  it('Processing and Scoring', function (done) {
    
    async.series([

            // After recreating all queues, trigger a pipeline happy flow
      function (cb) {
        
        console.info('triggering a new process through queue', config.queues.trigger_query);
        
        var message = {
          "requestType": "trigger",
          "data": {
            "from": DATE_TO_CHECK,
            "to": DATE_TO_CHECK
          }
        };
        return queueService.createMessage(config.queues.trigger_query, JSON.stringify(message), function (error) {
          if (error) return cb(error);
          console.info('trigger message successfully on ' + DATE_TO_CHECK);
          return cb();
        });

      }
    ], 
        
    // When done setting up, run all workers and when for checkups to complete
    function (err) {
      
      if (err) return doneWithError(err, done);
      
      // Periodic check for errors in the pipeline
      // The monitored errors will only be errors created by the testing process
      // which means any errors aggregated back from the processes of worker roles
      utils.checkForErrorsInLog(startTime, function (error) {
        
        if (error) {
          console.error('Error was found during the testing', error);
          return done(error);
        }
        
        return;
      });
      
      // Parallel check of all three worker roles.
      // If one role fails, the failure will fail the entire test immediately
      return async.parallel([
                
        // Periodic check that document was queried from service
        function (cb) {
          return utils.waitForLogMessage({
            message: 'done queuing messages for all documents', 
            app: 'query-id',
            since: startTime
          }, function (error) {
            if (error) return cb(error);
            
            // Check the specific document we expect in the pipeline was processed
            return utils.countLogMessages({
              message: 'Queued document ' + DOCUMENT_ID_TO_MONITOR,
              app: 'query-id',
              level: 'log',
              since: startTime
            }, function (error, count) {
              if (error) return cb(error);
              
              if (count == 0) {
                var docError = new Error('could not find document ' + DOCUMENT_ID_TO_MONITOR + ' in log');
                console.error(docError)
                return cb(docError);
              }
              
              console.info('Query ID worker test completed successfully');
              return cb();
            });
          });
        },

        // Periodic check that document was parsed for sentences
        function (cb) {
          
          return utils.waitForLogMessage({
            message: 'done queuing messages for document <' + DOCUMENT_ID_TO_MONITOR + '>', 
            app: 'paper-parser',
            since: startTime
          }, function (error) {
            if (error) return cb(error);
            
            // Check DB has appropriate document
            return utils.getTableRowCount('Documents', 'Id=' + DOCUMENT_ID_TO_MONITOR, function (error, count) {
              if (error) return cb(error);
              
              if (count == 0) {
                var countError = new Error('could not find document ' + DOCUMENT_ID_TO_MONITOR + ' in DB');
                console.error(countError);
                return cb(countError);
              }
              
              console.info('Paper parser worker test completed successfully');
              return cb();
            });
          });
        },

        // Periodic check that all sentences were scored
        function (cb) {
          
          // TODO:
          // Update 40 sentences to X sentences from the following document were scored
          return utils.waitForTableRowCount({
            tableName: 'Sentences', 
            where: 'DocId=' + DOCUMENT_ID_TO_MONITOR,
            expectedCount: 37
          }, function (err) {
            if (err) return cb(err);
            
            console.info('Scorer worker test completed successfully');
            return cb();
          });
        }
      ], function (err) {
        
        if (err) return doneWithError(err, done);
      
        return doneSuccessfully(done);
      });

    });

  });
  
  it('Re-scoring and Remodeling', function (done) {
    // FFU
    return done();
  });
  
  // Cleanup
  after(function (done) {
    
    // Request deletion of all queues so the recreation of the next test will take less time
    if (queueService) {
      queueService.deleteQueueIfExists(config.queues.trigger_query, function () { });
      queueService.deleteQueueIfExists(config.queues.new_ids, function () { });
      queueService.deleteQueueIfExists(config.queues.scoring, function () { });
    }
    
    return doneSuccessfully(done);
  });
})
