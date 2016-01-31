/*
 * from http://odetocode.com/blogs/scott/archive/2014/04/07/azure-webjobs-with-node-js.aspx
 * */

var Q = require("Q");
var azure = require("azure-storage");
var log = require("x-log");

module.exports = function(config) {

  var queueService;

  function init(cb) {
    var deferred = Q.defer();
    var cb = cb || Function();
    
    queueService = azure.createQueueService(config.storageName, config.storageKey)
      .withFilter(new azure.ExponentialRetryPolicyFilter());
    
    queueService.createQueueIfNotExists(config.queueName, function(err) {
      if (err) {
          cb(err);
          return deferred.reject(err);
      }
      
      log.info('listening on queue {}', config.queueName);
      
      cb();
      deferred.resolve();
    });
    
    return deferred.promise;    
  }

  function getSingleMessage(cb) {
    var deferred = Q.defer();
    var cb = cb || Function();

    queueService.getMessages(config.queueName, { 
        numofmessages: 1, 
        visibilitytimeout: 2 * 60 /* 2 minutes - hide item from queue for processing */
      },
      function (err, messages) {
        if (err) {
            cb(err);
            return deferred.reject(err);
        }
        
        var message;
        if (messages.length) message = messages[0];
        
        cb(null, message);
        deferred.resolve(message);
      }
    );

    return deferred.promise;
  };

  function deleteMessage(message, cb) {
    var deferred = Q.defer();
    var cb = cb || Function();

    queueService.deleteMessage(config.queueName, message.messageid,
      message.popreceipt, 
      function (err) {
        if (err) {
            cb(err);
            return deferred.reject(err);
        }
        
        cb();
        return deferred.resolve();
      }
    );

    return deferred.promise;
  };

  function sendMessage(message, cb) {
    var deferred = Q.defer();
    var cb = cb || Function();

    queueService.createMessage(config.queueName, JSON.stringify(message), 
      function (err) {
        if (err) {
            cb(err);
            return deferred.reject(err);
        }
        
        cb();
        return deferred.resolve();
      }
    );

    return deferred.promise;
  };

  return {
    init: init,
    getSingleMessage: getSingleMessage,
    deleteMessage: deleteMessage,
    sendMessage : sendMessage
  };
};