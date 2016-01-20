
var path = require('path');
var tedious = require('tedious');

var config = require('./config');

var queueConfig = {
    storageName: config.storage.account,
    storageKey: config.storage.key,
    queueName: config.queues.scoring,
    checkFrequency: 1000
};

var queueIn = require("./queue")(queueConfig);

queueIn.init().then(function() {
  console.log('start processing scoring queue');
  checkQueue();  
}, function(err) {
  console.error('error', err);
});

var checkQueue = function () {
  console.log('checking queue');
  queueIn.getSingleMessage()
      .then(processMessage)
      .catch(processError)
      .finally(setNextCheck);
};

var processMessage = function (message) {
    console.log('processMessage', message);
    
    if (!message) return;
    console.log('new message', message.messageid);
    
    queueIn.deleteMessage(message).then(function (err) {
        if (err) return console.error('error deleting item from queue', err);
        
        console.log('item deleted from queue');
        
        var msgObject = JSON.parse(message.messagetext);
        console.log('got a new message', msgObject);
        
        var data = msgObject.data[0];
        
        
        return checkQueue();

        if (msgObject.requestType === 'scoring') {
            var score = clrMethod(data.sentence, true);
            console.log('score for messageid', message.messageid, score);
            data.scoring = getScoring(score);
            
            return insertRelation(data, function (err) {
                if (err)
                    console.error(err);
                else
                    console.log('relation added to db');
                
                checkQueue();
            });
        }
    });
};

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

var processError = function (reason) {
    console.error("Error:", reason);
};

var setNextCheck = function () {
  console.log('setNextCheck');
  setTimeout(checkQueue, queueConfig.checkFrequency);
};

var _sqlConnection;
function SqlConnect(cb) {
    
    if (_sqlConnection && !_sqlConnection.closed) {
        return cb(null, _sqlConnection);
    }
    
    var configSql = require("./sql.azure.private.json");
    console.log('connecting to server', configSql.server);
    
    var Connection = tedious.Connection;
    var connection = new Connection(configSql);
    
    connection.on('connect', function (err) {
        if (err) {
            console.error('error connecting to sql server', configSql.server);
            return cb(err);
        }
        _sqlConnection = connection;
        console.log('connection established', !connection.closed);
        return cb(null, connection);
    });
}

function insertRelation(relation, cb) {
    
    SqlConnect(function (err, connection) {
        if (err) return cb(err);
        
        var TYPES = tedious.TYPES;
        var request = new tedious.Request('InsertRelation', function (err) {
            if (err) {
                console.error('error calling InsertRelation stored procedure', err);
                return cb(err);
            }
        });
        
        request.addParameter('DocId', TYPES.VarChar, relation.docId);
        request.addParameter('SentenceId', TYPES.BigInt, relation.sentenceId);
        request.addParameter('FromConceptId', TYPES.VarChar, relation.fromConceptId);
        request.addParameter('FromConceptType', TYPES.VarChar, relation.fromConceptType);
        request.addParameter('ToConceptId', TYPES.VarChar, relation.toConceptId);
        request.addParameter('ToConceptType', TYPES.VarChar, relation.toConceptType);
        request.addParameter('Relation', TYPES.VarChar, relation.scoring.relation);
        request.addParameter('Sentence', TYPES.Text, relation.sentence);
        request.addParameter('Score', TYPES.Real, relation.scoring.score);
        
        request.on('returnValue', function (parameterName, value, metadata) {
            console.log('returnValue', parameterName + ' = ' + value);
        });
        
        connection.callProcedure(request);

    });
}

/*
SqlConnect(function (err) {
    if (err) return console.error('error connecting to sql', err);
    checkQueue();
});
*/

