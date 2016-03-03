
var fs = require('fs');
var path = require('path');
var format = require("string_format");
var pipelineConfig = require('x-config');

var config = {
    queues: {
      trigger_query: { index: 0, name: process.env.QUEUE_TRIGGER_QUERY, worker: 'query-id' }, 
      new_ids: { index: 1, name: process.env.QUEUE_NEW_IDS, worker: 'paper-parser' },
      scoring: { index: 2, name: process.env.QUEUE_SCORING, worker: 'scoring' }
    },
    auth: {
        google: {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL
        }
    },
    apps: [
      { name: 'scoring', desc: 'the scorer worker' },
      { name: 'paper-parser', desc: 'the paper parser worker' },
      { name: 'query-id', desc: 'the documents query worker' },
      { name: 'graph', desc: 'the graph API web app' },
      { name: 'console', desc: 'the command line console web app' }
    ]
};

for (var key in pipelineConfig) {
  if (!config[key])
    config[key] = pipelineConfig[key];
}

function checkParam(paramValue, paramInfo, paramKey) {
    "use strict";

    if (!paramValue) {
        var errorFormat = '{} was not provided, please add {} to environment variables';
        throw new Error(errorFormat.format(paramInfo, paramKey));
    }
}

// validate queues
checkParam(config.queues.scoring, 'scoring queue name', 'QUEUE_SCORING');
checkParam(config.queues.new_ids, 'new ids queue', 'QUEUE_NEW_IDS');
checkParam(config.queues.trigger_query, 'trigger query queue', 'QUEUE_TRIGGER_QUERY');

// validate google authentication
checkParam(config.auth.google.clientID, 'google client Id', 'GOOGLE_CLIENT_ID');
checkParam(config.auth.google.clientSecret, 'google client secret', 'GOOGLE_CLIENT_SECRET');
checkParam(config.auth.google.callbackURL, 'google callback URL', 'GOOGLE_CALLBACK_URL');

module.exports = config;
