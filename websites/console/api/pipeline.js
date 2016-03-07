
var api = { console: { autoLoad: true} };

var express = require('express'),
  router = api.router = express.Router(),
  docRouter = require('docrouter').docRouter,
  config = require('../config'),
  azure = require('azure-storage'),
  async = require('async'),
  queue = require('x-queue'),
  db = require('./db'),
  constants = require('x-constants'),
  S = require('string');
  
  
var pipelineQueues = Object.keys(config.queues)
    .map(function (key) { return config.queues[key] })
    .sort(function (a, b) { return a.index > b.index; })
    .map(function (queue) { return queue.name });
  
var queueService = azure.createQueueService(config.storage.account, config.storage.key)
      .withFilter(new azure.ExponentialRetryPolicyFilter());

module.exports = api;

docRouter(router, "/api/pipeline", function (router) {
  
  router.get('/trigger', function (req, res) { 
    var queueName = req.query['queue'];
    var from = req.query['from'];
    var to = req.query['to'];
    
    var triggerQueue = queue({
      storageName: config.storage.account,
      storageKey: config.storage.key,
      queueName: queueName || config.queues.trigger_query.name,
      checkFrequency: 1000 /* every second */
    });

    triggerQueue.init(function (err) {
      if (err) return console.error('error initizalizing queue', triggerQueue, err);

      var message = { requestType: 'trigger', data: {} };
      if (from) message.data.from = message.data.fromDate = from;
      if (to) message.data.to = message.data.toDate = to;
      
      return triggerQueue.sendMessage(message, function (err, result) {
        if (err) return res.json({ err: err.message });
        return res.json({ result: 'success' });
      });
    });
  },
  {
      id: 'pipeline_trigger',
      name: 'trigger',
      usage: 'pipeline trigger',
      example: 'pipeline trigger',
      doc: 'Trigger the document querying process',
      params: {
        "queue": {
          "short": "q",
          "type": "string",
          "doc": "queue string param",
          "style": "query"
        },
        "from": {
          "short": "f",
          "type": "string",
          "doc": "from date in the format YYYY-MM-DD",
          "style": "query"
        },
        "to": {
          "short": "t",
          "type": "string",
          "doc": "to date in the format YYYY-MM-DD",
          "style": "query"
        }
      },
      response: { representations: ['application/json'] }
    }
  );
    
  router.get('/info', function (req, res) { 
      var obj = {};
      return async.each(pipelineQueues,
        function (queue, cb) {
          console.log('querying queue info', queue);
          return queueService.getQueueMetadata(queue,
            function (err, result) {
              if (err) return cb(err);
              return queueService.peekMessages(queue, {numOfMessages: 1},
                function (err, item) {
                  if (err) return cb(err);
                  obj[result.name] = {
                    length: result.approximatemessagecount, 
                    nextItem: item && item[0]
                  }; 
                  return cb();
                }
              );
            }
          ); 
        },
        function (err) {
          if (err) return res.json({ err: err.message }); 
          
          return res.json(obj);
        }
      );
    },
    {
      id: 'pipeline_info',
      name: 'info',
      usage: 'piepline info',
      example: 'piepline info',
      doc: 'Returns info for the pipeline',
      params: {},
      response: { representations: ['application/json'] }
    }
    );
  
    
  router.get('/status', function (req, res) { 
      var queuesCounters = {};
      return async.each(pipelineQueues,
        function (queue, cb) {
          console.log('querying queue info', queue);
          return queueService.getQueueMetadata(queue,
            function (err, result) {
              if (err) return cb(err);
              queuesCounters[result.name] = {
                length: result.approximatemessagecount, 
              }; 
              return cb();
            }
          ); 
        },
        function (err) {
          if (err) return res.json({ err: err.message }); 
          return db.getCounters(function (err, counters) { 
            if (err) return res.json({ err: err.message });
            
            var result = '<div style="border: 1px solid grey; padding: 0 5px 5px; display: inline-block;"><pre>';
            pipelineQueues.forEach(function (queue, index) { 
              var queueObj;
              for(var key in config.queues)
                if (queue === config.queues[key].name)
                  queueObj = config.queues[key];
                  
              result += S(queuesCounters[queue].length).padRight(10).s + ' ==>  ' + S(queueObj.worker).padRight(15).s + '</br>';
            });
            
            result += S('').pad(30, '-').s + "<br/>";
            
            var tables = Object.keys(counters);
            for (var i=0; i<tables.length; i++) {
              result += '[' + S(tables[i]).pad(12).s + ']: ' + counters[tables[i]] + '<br/>';
            }
            result += '</pre></div>';
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end(result); 
          });
        }
      );
    },
    {
      id: 'pipeline_status',
      name: 'status',
      usage: 'piepline status',
      example: 'piepline status',
      doc: 'Returns status for the pipeline',
      params: {}
    }
  );
  
  router.post('/clear/:name', function (req, res) { 
      var obj = {};
      return async.each(pipelineQueues, function (queue, cb) {
        return queueService.clearMessages(queue,
          function (err, result) {
            if (err) return cb(err); 
            obj[queue] = { isSuccessful: result.isSuccessful };
            return cb();
          });
        },
        function (err) {
          if (err) return res.json({ err: err.message }); 
          return res.json(obj);
        }
      );
    },
    {
      id: 'pipeline_clear',
      name: 'clear',
      usage: 'pipeline clear',
      example: 'pipeline clear',
      doc: 'Clears all pipeline queues',
      params: {},
      response: { representations: ['application/json'] }
    }
  );
  
  router.post('/rescore', function (req, res) { 
      var scoringQueue = queue({
        storageName: config.storage.account,
        storageKey: config.storage.key,
        queueName: config.queues.scoring.name
      });
      
      var msg = {
        requestType: constants.queues.action.RESCORE,
        data: {}
      };
      
      scoringQueue.init(function (err) {
        if (err) return console.error('error initizalizing queue', scoringQueue, err);
        return scoringQueue.sendMessage(msg, function (err) {
          if (err) return res.json({ err: err.message });
          console.log('rescoring request added to scoring queue');
          return res.end('rescoring request added to scoring queue');
        });
      });
    },
    {
      id: 'pipeline_rescore',
      name: 'rescore',
      usage: 'pipeline rescore',
      example: 'pipeline rescore',
      doc: 'Updates model and rescore all sentences',
      params: {
          "model": {
          "short": "m",
          "type": "string",
          "doc": "model path in blob container",
          "style": "query"
        }
      },
      response: { representations: ['application/json'] }
    }
  );
});
