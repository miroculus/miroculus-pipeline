var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');

var db = require('pl-db');
var constants = require('pl-constants');

router.get('/', function (req, res) { 
  db.getModelVersions(function (err, result) { 
    if (err) return res.end(err.message);
    res.setHeader('Content-Type', 'text/html');
    res.write('<p>Graph API<p>Please use one of the following links:<br/><ul>');
    for (var i = 0; i < (result && result.models && result.models.length); i++) {
      var model = result.models[i];
      res.write('<li><a href="/graph?scoringServiceId=' + model.ScoringServiceId + '&modelVersion=' + model.ModelVersion
        + '">/graph?scoringServiceId=' + model.ScoringServiceId + '&modelVersion=' + model.ModelVersion + '<a></li>');
    }
    res.end('</ul>');
  });
});

router.get('/models', function (req, res) { 
  db.getModelVersions(function (err, result) { 
    if (err) res.status(500).json({ error: err.message });
    return res.json(result);
  });
});

// this is a temporary workaround for fetching document
// returns a permanent doc sample of 2000354
router.get('/doc/pmc/*', function(req, res) {
  res.setHeader("content-type", "application/json");
  var filePath = path.join(__dirname, 'sample', '2000354.json');
  fs.createReadStream(filePath).pipe(res);
});

router.get('/graph', function (req, res) {
  var scoringServiceId = req.query.scoringServiceId;
  var modelVersion = req.query.modelVersion;

  if (!scoringServiceId || !modelVersion)
    return res.end('please provide scoringServiceId and modelVersion query parameters');
  
  var currSet;
  var firstRow = true;

  var sep = '_';
  var transformers = {
    nodes: function (row) {
      return {
        id: ['n', row.TypeId, row.Id].join(sep),
        entityId: row.Id,
        group: constants.conceptTypesById[row.TypeId].toUpperCase()
      };
    },
    edges: function (row) {
      var fromId = [row.Entity1TypeId, row.Entity1Id].join(sep);
      var toId = [row.Entity2TypeId, row.Entity2Id].join(sep);

      var data = JSON.parse(row.Json);      
      
      var obj = {
        from: {
          id: ['n', fromId].join(sep),
          start: data.entity1.from,
          end: data.entity1.to
        },
        to: {id: ['n', toId].join(sep),
         start: data.entity2.from,
         end: data.entity2.to
        },
        id: ['e', row.SourceId, row.DocId, row.SentenceIndex, fromId, toId].join(sep),
        class: row.Relation,
        score: row.Score,
        documentId: row.DocId,
        Sentence: row.Sentence
      };
      return obj;
    }
  }; 
  
  function rowHandler(set, row) {
    if (!currSet) {
      res.setHeader('Content-Type', 'application/json');
      res.write('{');
    }
      
    if (currSet !== set) {
      if (currSet) {
        res.write('], ');
        firstRow = true;  
      }
      currSet = set;
      res.write('"' + set + '": [')
    }
    
    if (!firstRow)
      res.write(',');
    else
      firstRow = false;
       
    var transformedRow = transformers[currSet](row);
    res.write(JSON.stringify(transformedRow));
  }
  
  return db.getGraph({
    scoringServiceId: scoringServiceId,
    modelVersion: modelVersion,
    rowHandler: rowHandler
    },
    function (err) { 
      if (err) return res.status(500).json({ error: err });
      res.write(']}'); // close last set
      return res.end();
    }
  );
});

router.use(function (req, res) {
    return res.status(404).json({ error: 'not found' });
});

module.exports = router;
