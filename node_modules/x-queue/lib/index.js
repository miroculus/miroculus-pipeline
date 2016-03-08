var azure = require("azure-storage");

module.exports = function(config) {

  var queueService;

  function init(cb) {
    cb = cb || Function();
    
    queueService = azure.createQueueService(config.storageName, config.storageKey)
      .withFilter(new azure.ExponentialRetryPolicyFilter());
    
    return queueService.createQueueIfNotExists(config.queueName, function(err) {
      if (err) return cb(err);
      
      console.info('listening on queue', config.queueName);
      return cb(null, queueService);
    });
  }

  function getSingleMessage(cb) {
    cb = cb || Function;

    return queueService.getMessages(config.queueName, { 
        numofmessages: 1, 
        visibilitytimeout: config.visibilityTimeout || 2 * 60
      },
      function (err, messages) {
        if (err) return cb(err);
        var message = messages && messages.length && messages[0]; 
        return cb(null, message);
      }
    );
  };

  function deleteMessage(message, cb) {
    cb = cb || Function;

    return queueService.deleteMessage(config.queueName,
      message.messageid,
      message.popreceipt, 
      cb
    );
  };

  function sendMessage(message, cb) {
    cb = cb || Function;

    return queueService.createMessage(config.queueName,
      JSON.stringify(message),
      cb);
  };

  return {
    init: init,
    getSingleMessage: getSingleMessage,
    deleteMessage: deleteMessage,
    sendMessage: sendMessage,
    config: config
  };
};