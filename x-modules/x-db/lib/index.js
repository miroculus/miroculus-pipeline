var tedious = require('tedious');
var TYPES = tedious.TYPES;
var configSql = require('x-config').sql;

var DBErrors = {
    duplicate: 2601
}

function connect(cb) {
    console.log('connecting to server', configSql.server);

    var Connection = tedious.Connection;
    var connection = new Connection(configSql);

    connection.on('connect', function(err) {
        if (err) {
            console.error('error connecting to sql server', configSql.server);
            return cb(err);
        }
        console.log('connection established', !connection.closed);
        return cb(null, connection);
    });
}


function upsertRelation(relation, cb) {
    
    connect(function (err, connection) {
      if (err) return cb(err);
      
      var request = new tedious.Request('UpsertRelation', function (err) {
        if (err) {
          console.error('error calling UpsertRelation stored procedure', err);
          return cb(err);
        }
      });
      
      request.addParameter('SourceId', TYPES.VarChar, relation.sourceId);
      request.addParameter('DocId', TYPES.VarChar, relation.docId);
      request.addParameter('SentenceIndex', TYPES.Int, relation.sentenceIndex);
      request.addParameter('FromConceptId', TYPES.Int, relation.fromConceptId);
      request.addParameter('FromConceptName', TYPES.VarChar, relation.fromConceptName);
      request.addParameter('ToConceptId', TYPES.Int, relation.toConceptId);
      request.addParameter('ToConceptName', TYPES.VarChar, relation.toConceptName);
      request.addParameter('Relation', TYPES.Int, relation.scoring.relation);
      request.addParameter('Score', TYPES.Real, relation.scoring.score);
      request.addParameter('ModelVersion', TYPES.VarChar, relation.modelVersion);
      request.addParameter('Sentence', TYPES.NText, relation.sentence);
      
      request.on('returnValue', function (parameterName, value, metadata) {
        console.log('returnValue', parameterName + ' = ' + value);
      });
      
      connection.callProcedure(request);

    });
}

function getDataSets(opts, cb) {
  connect(function(err, connection){
    if (err) return logError(err, cb);

    var sproc = opts.sproc,
      sets = opts.sets,
      params = opts.params,
      currSetIndex = -1;

    var result = {};

    var request = new tedious.Request(sproc, function(err, rowCount, rows) {
      if (err) return logError(err, cb);
    });

    for (var i=0; i<params.length; i++) {
      var param = params[i];
      request.addParameter(param.name, param.type, param.value);
    }

    request.on('columnMetadata', function (columns) {
      currSetIndex++;
      result[sets[currSetIndex]] = [];
    });

    request.on('row', function (columns) {
      var rowObj = {};
      for(var i=0; i<columns.length; i++) {
          rowObj[columns[i].metadata.colName] = columns[i].value;
      }
      result[sets[currSetIndex]].push(rowObj);
    });

    request.on('doneProc', function (rowCount, more, returnStatus, rows) {
      cb(null, result);
    });

    connection.callProcedure(request);

  });
}

function logError(err, cb) {
  console.error('error:', err);
  return cb(err);
}


module.exports = {
  connect: connect,
  upsertRelation: upsertRelation
}