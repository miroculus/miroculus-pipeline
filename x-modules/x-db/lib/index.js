/* global . */
var tedious = require('tedious');
var TYPES = tedious.TYPES;
var configSql = require('x-config').sql;

var DBErrors = {
    duplicate: 2601
}

function connect(cb) {
  var Connection = tedious.Connection;
  var connection = new Connection(configSql);

  return connection.on('connect', function(err) {
    if (err) return logError(err, cb);
    return cb(null, connection);
  });
}


function upsertRelations(opts, cb) {
    
  return connect(function (err, connection) {
    if (err) return logError(err, cb);
    
    var request = new tedious.Request('UpsertRelation', cb);
    
    request.addParameter('SourceId', TYPES.VarChar, opts.sourceId);
    request.addParameter('DocId', TYPES.VarChar, opts.docId);
    request.addParameter('SentenceIndex', TYPES.Int, opts.sentenceIndex);
    request.addParameter('ModelVersion', TYPES.VarChar, opts.modelVersion);
    request.addParameter('Sentence', TYPES.Text, opts.sentence);
    
    var relationsTable = {
      columns: [
        { name: 'Entity1TypeId', type: TYPES.Int },
        { name: 'Entity1TypeName', type: TYPES.VarChar },
        { name: 'Entity2TypeId', type: TYPES.Int },
        { name: 'Entity2TypeName', type: TYPES.VarChar },
        { name: 'Relation', type: TYPES.Int },
        { name: 'Score', type: TYPES.Real }
      ],
      rows: []
    };

    var relations = opts.relations || [];
    for (var i=0; i < relations.length; i++) {
      var relation = relations[i];
      relationsTable.rows.push([
        relation.entity1.typeId,
        relation.entity1.name,
        relation.entity2.typeId,
        relation.entity2.name,
        relation.relation,
        relation.score
      ]);
    }
    request.addParameter('relations', TYPES.TVP, relationsTable);
    
    request.on('returnValue', function (parameterName, value, metadata) {
      console.log('returnValue', parameterName + ' = ' + value);
    });
    
    return connection.callProcedure(request);
  });
}

function getDataSets(opts, cb) {
  return connect(function(err, connection){
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

    return connection.callProcedure(request);
  });
}

function logError(err, cb) {
  console.error('error:', err);
  return cb(err);
}


module.exports = {
  connect: connect,
  upsertRelations: upsertRelations
}