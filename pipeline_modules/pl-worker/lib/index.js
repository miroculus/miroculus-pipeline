
var async = require('async');
var queue = require('pl-queue');
var config = require('pl-config');

var QueueType = {
  IN: 'in',
  OUT: 'out'
};

function start(opts, cb) {
  if (!opts.queueInName) return cb(new Error('queueInName was not provided'));
  
  var processMessage = opts.processMessage;
  if (!processMessage || typeof processMessage !== 'function') return cb(new Error('processMessage funtion was not provided'));

  console.log('worker.start:', config.currentRole);

  if (!cb || typeof cb !== 'function') return cb(new Error('callback function was not provided'));

  var queuesConfig = [];
  var queues = {}, queueIn, queueOut;

  var api = {
    queueIn: null,
    queueOut: null
  };
  
  queuesConfig.push({
    storageName: config.storage.account,
    storageKey: config.storage.key,
    queueName: opts.queueInName,
    visibilityTimeout: config.queue.visibilityTimeoutSecs,
    checkFrequency: config.queue.checkFrequencyMsecs,
    type: QueueType.IN
  });
  
  if (opts.queueOutName) {
    queuesConfig.push({
      storageName: config.storage.account,
      storageKey: config.storage.key,
      queueName: opts.queueOutName,
      visibilityTimeout: config.queue.visibilityTimeoutSecs,
      checkFrequency: config.queue.checkFrequencyMsecs,
      type: QueueType.OUT
    });
  }

  function initQueues() {
    return async.each(queuesConfig, function(queueConfig, cb) {
        console.log('initializing queue: ', queueConfig.queueName);
        var queueObj = queue(queueConfig);
        queueObj.init(function (err) {
          if (err) return cb(err);
          console.log('queue %s initialized...', queueConfig.queueName);
          queues[queueConfig.type] = queueObj;
          return cb();
        });
      }, 
      function(err) {
        if (err) {
          console.error('error initializing queues', err);
          return cb(err);
        }

        api.queueIn = queueIn = queues[QueueType.IN];
        api.queueOut = queueOut = queues[QueueType.OUT];
        checkInputQueue();
        return cb();
      }
    );
  }
  
  function checkInputQueue() {
    console.log('checking queue:', queueIn.config.queueName);
    queueIn.getSingleMessage(function (err, message) {
      if (err) {
        console.error('error getting message from queue', err);
        return setNextCheck();
      }

      // if we don't have a message, wait a bit and check later
      if (!message) {
        return setNextCheck();
      }

      console.log('new message:', message);
      
      // try to parse message json
      var msgObject;
      try {
        msgObject = JSON.parse(message.messagetext);
      }
      catch (err) {
        console.error('error parsing message, invalid json, deleting...', message);
        return deleteMessage(message);
      }
      
      // run service specific processMessage handler
      // pass the message object
      return processMessage(msgObject, function (err) {
        if (err) {
          console.error('error processing message:', message.messageid, err);
          
          // move to the next message immediately without waiting
          return checkInputQueue();
        } else {
          // message processed successfully- delete and move on the next one
          return deleteMessage(message, function(err) {
            if (err) console.error('error deleting message:', message.messageid, err);
            
            // move to the next message immediately without waiting
            return checkInputQueue();
          });
        }
      });
    });
  }

  function setNextCheck() {
    console.log('setNextCheck', queueIn.config.queueName);
    setTimeout(checkInputQueue, queueIn.config.checkFrequency);
  };

  function deleteMessage(message, cb) {
    console.log('deleting item', message.messageid);
    return queueIn.deleteMessage(message, function (err) {
      if (err) return cb(new Error('error deleting item from queue', err));
      console.log('item deleted from queue', message.messageid);
      return cb();
    });
  }

  initQueues();

  return api;
}

module.exports.start = start;
