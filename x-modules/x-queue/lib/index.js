/*
 * from http://odetocode.com/blogs/scott/archive/2014/04/07/azure-webjobs-with-node-js.aspx
 * */

var Q = require("Q");
var azure = require("azure-storage");

module.exports = function(config) {

  var queueService;

  function init() {
    var deferred = Q.defer();
    
    queueService = azure.createQueueService(config.storageName, config.storageKey)
      .withFilter(new azure.ExponentialRetryPolicyFilter());
    
    queueService.createQueueIfNotExists(config.queueName, function(err) {
      if (err) return deferred.reject(err);
      
      console.log('listening on queue', config.queueName);
      deferred.resolve();
    });
    
    return deferred.promise;    
  }

  function getSingleMessage() {
    var deferred = Q.defer();

    queueService.getMessages(config.queueName, { 
        numofmessages: 1, 
        visibilitytimeout: 2 * 60 
      },
      function (err, messages) {
        if (err) return deferred.reject(err);
        if (messages.length)
          deferred.resolve(messages[0]);
        else 
          deferred.resolve();
      }
    );

    return deferred.promise;
  };

  function deleteMessage(message) {
    var deferred = Q.defer();

    queueService.deleteMessage(config.queueName, message.messageid,
      message.popreceipt, 
      function (err) {
        if (err) return deferred.reject(err);
        return deferred.resolve();
      }
    );

    return deferred.promise;
  };

  function sendMessage(message) {
    var deferred = Q.defer();

    queueService.createMessage(config.queueName, JSON.stringify(message), 
      function (err) {
        if (err) return deferred.reject(err);
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