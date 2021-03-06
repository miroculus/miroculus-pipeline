var tedious = require('tedious');
var Connection = tedious.Connection;
var ConnectionPool = require('tedious-connection-pool');
var Request = tedious.Request;
var TYPES = tedious.TYPES;
var moment = require('moment');
var constants = require('pl-constants');
var configSql = require('pl-config').sql;

var DBErrors = {
    duplicate: 2601
};

// TODO: move to configuration
var poolConfig = {
    min: 2,
    max: 5,
    idleTimeout: 10000,
    log: false
};

var pool = new ConnectionPool(poolConfig, configSql);
pool.on('error', function (err) {
  console.error('error connecting to sql', err);
});

function logError(err, connection, cb) {
  console.error('error:', err);
  console.log('releasing connection');
  if (connection) connection.release();
  return cb(err);
}

function connect(cb) {
  return pool.acquire(cb);
}

function getCloseConnectionCb(connection, cb) {
  return function () {
    connection.release();
    return cb.apply(null, arguments);
  }
}

function upsertRelations(opts, cb) {
  return connect(function (err, connection) {
    if (err) return logError(err, connection, cb);
    
    var request = new tedious.Request('UpsertRelations', getCloseConnectionCb(connection, cb));
    
    request.addParameter('SourceId', TYPES.Int, opts.sourceId);
    request.addParameter('DocId', TYPES.Int, opts.docId);
    request.addParameter('SentenceIndex', TYPES.Int, opts.sentenceIndex);
    request.addParameter('Sentence', TYPES.Text, opts.sentence);
    request.addParameter('MentionsJson', TYPES.Text, JSON.stringify(opts.mentions));
        
    // entities
    var entitiesTable = {
      columns: [
        { name: 'TypeId', type: TYPES.Int },
        { name: 'Id', type: TYPES.VarChar },
        { name: 'Name', type: TYPES.VarChar }
      ],
      rows: []
    };

    var entities = opts.entities || [];
    for (var i=0; i < entities.length; i++) {
      var entity = entities[i];
      entitiesTable.rows.push([
        entity.typeId,
        entity.id,
        entity.name
      ]);
    }
    request.addParameter('entities', TYPES.TVP, entitiesTable);
    
    // relations
    var relationsTable = {
      columns: [
        { name: 'ScoringServiceId', type: TYPES.VarChar },
        { name: 'ModelVersion', type: TYPES.VarChar },
        { name: 'Entity1TypeId', type: TYPES.Int },
        { name: 'Entity1Id', type: TYPES.VarChar },
        { name: 'Entity2TypeId', type: TYPES.Int },
        { name: 'Entity2Id', type: TYPES.VarChar },
        { name: 'Relation', type: TYPES.VarChar },
        { name: 'Score', type: TYPES.Real },
        { name: 'Json', type: TYPES.VarChar }
      ],
      rows: []
    };

    var relations = opts.relations || [];
    for (var i=0; i < relations.length; i++) {
      var relation = relations[i];
      relationsTable.rows.push([
        relation.scoringServiceId,
        relation.modelVersion,
        relation.entity1.typeId,
        relation.entity1.id,
        relation.entity2.typeId,
        relation.entity2.id,
        relation.relation,
        relation.score,
        JSON.stringify(relation.data)
      ]);
    }
    request.addParameter('relations', TYPES.TVP, relationsTable);
    
    return connection.callProcedure(request);
  });
}

function getDataSets(opts, cb) {
  return connect(function(err, connection){
    if (err) return logError(err, connection, cb);

    var sproc = opts.sproc,
      sets = opts.sets,
      params = opts.params,
      currSetIndex = -1;

    var result = {};

    var request = new tedious.Request(sproc, function(err, rowCount, rows) {
      if (err) return logError(err, connection, cb);
    });

    for (var i = 0; i < (params && params.length); i++) {
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
      getCloseConnectionCb(connection, cb)(null, result);
    });

    return connection.callProcedure(request);
  });
}

/*
req: {
    docs: [
        {
            sourceId: 1,
            docId: 'AAA'
        }
    ]
}
*/
function getUnprocessedDocuments(req, cb) {

    var table = {
        columns: [
            {name: 'SourceId', type: TYPES.Int},
            {name: 'DocId', type: TYPES.VarChar}
        ],
        rows: []
    };

    for (var i =0; i < req.docs.length; i++) {
        var doc = req.docs[i];
        table.rows.push([doc.sourceId, doc.docId]);
    }

    var params = [
        { name: 'Docs', type: TYPES.TVP, value: table }
    ];
    
    return getDataSets({
        sproc: 'FilterExistingDocuments',
        sets: ['docs'],
        params: params
    }, function(err, result) {
        if (err) return logError(err, null, cb);

        return cb(null, result);
    });
} 

function getModelVersions(cb) {
    return getDataSets({
        sproc: 'GetGraphModelVersions',
        sets: ['models']
    }, function(err, result) {
        if (err) return logError(err, null, cb);
        return cb(null, result);
    });
} 


function upsertDocument(opts, cb) {

  return connect(function (err, connection) {
    if (err) return logError(err, connection, cb);

    var request = new tedious.Request('UpsertDocument', getCloseConnectionCb(connection, cb));

    request.addParameter('SourceId', TYPES.Int, opts.sourceId);
    request.addParameter('Id', TYPES.Int, opts.docId);
    request.addParameter('Description', TYPES.VarChar, opts.Description);
    request.addParameter('StatusId', TYPES.Int, opts.statusId);

    return connection.callProcedure(request);
  });
}


function updateDocumentStatus(opts, cb) {
  return connect(function (err, connection) {
    if (err) return logError(err, connection, cb);
    
    var request = new tedious.Request('UpdateDocumentStatus', getCloseConnectionCb(connection, cb));
    
    request.addParameter('SourceId', TYPES.VarChar, opts.sourceId);
    request.addParameter('DocId', TYPES.VarChar, opts.docId);
    request.addParameter('StatusId', TYPES.Int, opts.statusId);
    
    return connection.callProcedure(request);
  });
}

function getGraph(opts, cb) {

  var sproc = 'GetGraph';
  var params = [
    { name: 'ScoringServiceId', type: TYPES.VarChar, value: opts.scoringServiceId },
    { name: 'ModelVersion', type: TYPES.VarChar, value: opts.modelVersion }
  ];
  var sets = ['nodes', 'edges'];
  
  var rowHandler = opts.rowHandler || Function;
  
 return connect(function(err, connection){
    if (err) return logError(err, connection, cb);

    var request = new tedious.Request(sproc, function(err, rowCount, rows) {
      if (err) return logError(err, connection, cb);
    });

    for (var i=0; i<params.length; i++) {
      var param = params[i];
      request.addParameter(param.name, param.type, param.value);
    }

    var currSetIndex = -1;
    var currSet;

    request.on('columnMetadata', function (columns) {
      currSetIndex++;
      currSet = sets[currSetIndex];
    });

    request.on('row', function (columns) {
      var rowObj = {};
      for(var i=0; i<columns.length; i++) {
          rowObj[columns[i].metadata.colName] = columns[i].value;
      }
      return rowHandler(currSet, rowObj);
    });

    request.on('doneProc', function (rowCount, more, returnStatus, rows) {
      getCloseConnectionCb(connection, cb)();
    });

    return connection.callProcedure(request);
  });
} 

function getSentences(opts, cb) {
  opts.sproc = 'GetSentences';
  return getBatch(opts, cb);
}

function getDocuments(opts, cb) {
  opts.sproc = 'GetDocuments';
  return getBatch(opts, cb);
}

function getBatch(opts, cb) {

  var rowHandler = opts.rowHandler;
  if (!rowHandler || typeof rowHandler !== 'function') return cb(new Error('please provide a rowHandler funtion'));
  
  var sproc = opts.sproc;
  if (!sproc) return cb(new Error('please provide a sproc name'));
  
  var batchSize = opts.batchSize || 1000;
  var timestamp = opts.timestampUTC || moment.utc().toDate();
  var offset = 0;

  return getNextBatch(cb);

  function getNextBatch(cb) {

    return connect(function (err, connection) {
      if (err) return logError(err, connection, cb);

      var request = new tedious.Request(sproc, function (err, rowCount, rows) {
        if (err) return logError(err, connection, cb);
      });

      request.addParameter('Offset', TYPES.BigInt, offset);
      request.addParameter('BatchSize', TYPES.BigInt, batchSize);
      request.addParameter('Timestamp', TYPES.DateTime, timestamp);
      var rowCount = 0;
      request.on('row', function (columns) {
        rowCount++;
        var rowObj = {};
        for (var i = 0; i < columns.length; i++) {
          rowObj[columns[i].metadata.colName] = columns[i].value;
        }
        return rowHandler(rowObj);
      });

      request.on('doneProc', function () {
        // if we have a full batch, that means we migt have more
        // rows, continue fetching next batch
        if (rowCount == batchSize) {
          offset += batchSize;
          console.log('getting next batch: %s - %s', offset, batchSize);
          connection.release();
          return getNextBatch(cb);
        }

        return getCloseConnectionCb(connection, cb)();
      });

      return connection.callProcedure(request);
    });
  }
} 

module.exports = {
  connect: connect,
  getDataSets: getDataSets,
  upsertRelations: upsertRelations,
  getUnprocessedDocuments: getUnprocessedDocuments,
  upsertDocument: upsertDocument,
  updateDocumentStatus: updateDocumentStatus,
  getModelVersions: getModelVersions,
  getGraph: getGraph,
  getSentences: getSentences,
  getDocuments: getDocuments
}
