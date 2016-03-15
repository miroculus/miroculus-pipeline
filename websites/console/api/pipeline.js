
var api = { console: { autoLoad: true} };

var express = require('express'),
  router = api.router = express.Router(),
  docRouter = require('docrouter').docRouter,
  config = require('../config'),
  azure = require('azure-storage'),
  async = require('async'),
  queue = require('pl-queue'),
  db = require('./db'),
  constants = require('pl-constants'),
  S = require('string'),
  request = require('request'),
  url = require('url');
  
var pipelineQueues = Object.keys(config.queues)
    .map(function (key) { return config.queues[key] })
    .sort(function (a, b) { return a.index > b.index; })
    .map(function (queue) { return queue.name });
  
var queueService = azure.createQueueService(config.storage.account, config.storage.key)
      .withFilter(new azure.ExponentialRetryPolicyFilter());

var scoringServices = {};
config.services.scoring.forEach(function(service) {
  scoringServices[service.id.toUpperCase()] = service;
});

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
      if (from) message.data.from = from;
      if (to) message.data.to = to;
      
      return triggerQueue.sendMessage(message, function (err, result) {
        if (err) return res.json({ err: err.message });
        var result = {
          status: 'OK',
          message: 'trigger request sent successfully',
        };
        if (from) result.from = from;
        if (to) result.to = to;
        return res.json(result);
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
  
  router.post('/clear', function (req, res) { 
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
          return res.json({
            status: 'OK', 
            message: 'clear request completed successfully',
            queus: obj
          });
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
  
  router.post('/updatemodel', function(req, res) {
      var service = req.body.service.toUpperCase();
      var path = req.body.path;

      if (!scoringServices[service]) return res.json({ err: 'service ' + service + ' does not exists' });
      var urlElements = url.parse(scoringServices[service].url);
      var address = urlElements.protocol + "//" + urlElements.hostname + '/updatemodel'; 
    
      var opts = {
        url: address,
        method: 'POST',
        json: {
          "path": path
        }
      };

      return request(opts, function(err, resp, body) {
        if (err) return res.json({ err: err.message });
        return res.json({
          status: 'OK', 
          message: 'update model request sent successfully',
          service: service,
          endpoint: address
        });
      });
    },
    {
      id: 'pipeline_updatemodel',
      name: 'updatemodel',
      usage: 'pipeline updatemodel',
      example: 'pipeline updatemodel',
      doc: 'Updates model in scorer services',
      params: {
          "path": {
            "short": "p",
            "type": "string",
            "doc": "model path in blob container",
            "style": "body",
            "required": "true"
        },
          "service": {
            "short": "s",
            "type": "string",
            "doc": "the service to send update request: " + Object.keys(scoringServices).join(','),
            "style": "body",
            "required": "true"
        }
      },
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
          console.log('rescoring request sent successfully');
          return res.json({ 
            status: 'OK', 
            message: 'rescoring request sent successfully',
            queue: config.queues.scoring.name
          });
        });
      });
    },
    {
      id: 'pipeline_rescore',
      name: 'rescore',
      usage: 'pipeline rescore',
      example: 'pipeline rescore',
      doc: 'Updates model and rescore all sentences',
      params: {},
      response: { representations: ['application/json'] }
    }
    );
  
  
  router.post('/reprocess', function (req, res) { 
      var queryQueue = queue({
        storageName: config.storage.account,
        storageKey: config.storage.key,
        queueName: config.queues.trigger_query.name
      });
      
      var msg = {
        requestType: constants.queues.action.REPROCESS,
        data: {}
      };
      
      queryQueue.init(function (err) {
        if (err) return console.error('error initizalizing queue', queryQueue, err);
        return queryQueue.sendMessage(msg, function (err) {
          if (err) return res.json({ err: err.message });
          console.log('reprocess request sent successfully');
          return res.json({ 
            status: 'OK', 
            message: 'reprocess request sent successfully',
            queue: config.queues.trigger_query.name
          });
        });
      });
    },
    {
      id: 'pipeline_reprocess',
      name: 'reprocess',
      usage: 'pipeline reprocess',
      example: 'pipeline reprocess',
      doc: 'Reprocess all documents',
      params: {},
      response: { representations: ['application/json'] }
    }
  );
  
});
