var tedious = require('tedious');
var log = require('./log.js');

/**
 * @typedef {Object} SqlConfig
 * @property {string} server Server name to connect to
 */

/**
 * @typedef {Object} DataSetOptions
 * @property {object} sproc     ???
 * @property {object} sets      ???
 * @property {object} params    ???
 */

var db = (function () {
    "use strict";

    var DBErrors = {
        duplicate: 2601
    };
    
    /**
     * Connect to data base
     * 
     * @param {SqlConfig} config - SQL connection configuration
     */
    var connect = function (config, callback) {
        log.info('connecting to server {}', config.server);
        var connection = new tedious.Connection(config);
        connection.on('connect', function (err) {
            if (err) {
                log.error('error connecting to sql server <{}>', config.server);
                return callback(err);
            }
            log.info('connection established is {}', !(connection).closed);
            return callback(null, connection);
        });
    };
    
    /**
     * Execute an SQL command
     * 
     * @param {SqlConfig}   config          SQL connection configuration
     * @param {Object}      callback        Callback to call when execution is done
     */
    var execute = function (config, callback) {
        connect(config, function (err, connection) {
            if (err) {
                return callback(err);
            }
            
            var request = new tedious.Request("INSERT test (Name) VALUES (@Name);", function (err) {
                if (err) {
                    log.error(err);
                }
            });
            request.addParameter('Name', tedious.TYPES.NVarChar, 'tshello! ' + new Date().getTime());
            connection.execSql(request);
        });
    };
    
    /**
     * Get dataset from database
     * 
     * @param {SqlConfig}       config          SQL connection configuration
     * @param {DataSetOptions}  opts            DataSet options
     * @param {Object}          callback        Callback to call when dataset is available
     */
    var getDataSets = function (config, opts, callback) {
        connect(config, function (err, connection) {
            if (err) {
                log.error(err);
                return callback(err);
            }

            var sproc = opts.sproc,
                sets = opts.sets,
                params = opts.params,
                currSetIndex = -1;
            
            var result = {};
            
            var request = new tedious.Request(sproc, function (err, rowCount, rows) {
                if (err) {
                    log.error(err);
                    return callback(err);
                }
            });
            
            for (var i in params) {
                var param = params[i];
                request.addParameter(param.name, param.type, param.value);
            }
            
            request.on('columnMetadata', function (columns) {
                currSetIndex++;
                result[sets[currSetIndex]] = [];
            });
            
            request.on('row', function (columns) {
                var rowObj = {};
                for (var i = 0; i < columns.length; i++) {
                    rowObj[columns[i].metadata.colName] = columns[i].value;
                }
                result[sets[currSetIndex]].push(rowObj);
            });
            
            request.on('doneProc', function (rowCount, more, returnStatus, rows) {
                callback(null, result);
            });
            
            connection.callProcedure(request);

        });
    }

    return {
        connect: connect,
        execute: execute,
        getDataSets: getDataSets,
    };
}());

module.exports = db;