
var path = require('path');
var tedious = require('tedious');
var config = require('x-config');
var queue = require('x-queue');
var db = require('x-db');
var constants = require('x-constants');

function run(cb) {
  console.log('starting scoring worker...');
  
  cb = cb || Function;
  var queueConfig = {
    storageName: config.storage.account,
    storageKey: config.storage.key,
    queueName: config.queues.scoring,
    checkFrequency: 1000
  };

  var queueIn = queue(queueConfig);

  queueIn.init().then(function () {
    console.log('start processing scoring queue');
    checkQueue();
  }, function (err) {
    console.error('error', err);
    return cb(err);
  });

  var checkQueue = function () {
    //console.log('checking queue');
    queueIn.getSingleMessage()
      .then(processMessage)
      .catch(processError)
      .finally(setNextCheck);
  };

  var processMessage = function (message) {
    if (!message) return;
    console.log('new message', message.messageid);
    var msgObject = JSON.parse(message.messagetext);

    console.log('got a new message', msgObject);

    var data = msgObject.data && msgObject.data;
    if (!data) return console.warn('message does not contain data field');
    
    if (msgObject.requestType === constants.Queues.Action.SCORE) {
      var score = [0.3, 0.4, 0.2, 0.1]; // call score here
      console.log('score for messageid', message.messageid, score);
      
      data.scoring = getScoring(score);
      console.log('got scoring relation:', data.scoring);

      // insert relation into db
      return db.upsertRelation(data, function (err) { 
        if (err) return console.error('error updating relation in db', err);
          
        // delete message from queue
        return queueIn.deleteMessage(message).then(function (err) {
          if (err) return console.error('error deleting item from queue', err);
          console.log('item deleted from queue');

          return checkQueue();
        });
      });
    }
    else {
      console.error('message should not appear in this queue, deleting...', message);
      return queueIn.deleteMessage(message).then(function (err) {
          if (err) return console.error('error deleting item from queue', err);
          console.log('item deleted from queue');
          return checkQueue();
      });
    }
  };

  // TODO: revisit after Justin publishes his API
  function getScoring(scoring) {
    var index = 0;
    var score = 0;
    for (var i = 0; i < scoring.length; i++) {
      if (parseFloat(scoring[i]) > score) {
        score = parseFloat(scoring[i]);
        index = i;
      }
    }

    return {
      score: score,
      relation: index + 1
    }
  }

  var processError = function (err) {
    console.error("Error:", err);
    return cb(err);
  };

  var setNextCheck = function () {
    //console.log('setNextCheck');
    setTimeout(checkQueue, queueConfig.checkFrequency);
  };
}

module.exports = {
    run: run
}