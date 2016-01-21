var tedious = require('tedious');
var log = require('./log.js');
var configSql = require('./config.js').sql;

function logError(err, cb) {
    log.error('error:', err);
    return cb(err);
}

var db = {
    DBErrors: {
        duplicate: 2601
    },

    connect: function (cb) {
        log.info('connecting to server', configSql.server);
    
        var connection = new tedious.Connection(configSql);
    
        connection.on('connect', function (err) {
            if (err) {
                log.error('error connecting to sql server', configSql.server);
                return cb(err);
            }
            log.info('connection established', !(connection).closed);
            return cb(null, connection);
        });
    },


    execute: function (cb) {
        connect(function (err, connection) {
            if (err) return cb(err);
        
            var request = new tedious.Request("INSERT test (Name) VALUES (@Name);", function (err) {
                if (err) {
                    console.log(err);
                }
            });
            request.addParameter('Name', tedious.TYPES.NVarChar, 'tshello! ' + new Date().getTime());
            connection.execSql(request);
        });
    },

    getDataSets: function (opts, cb) {
        connect(function (err, connection) {
            if (err) return logError(err, cb);
        
            var sproc = opts.sproc,
                sets = opts.sets,
                params = opts.params,
                currSetIndex = -1;
        
            var result = {};
        
            var request = new tedious.Request(sproc, function (err, rowCount, rows) {
                if (err) return logError(err, cb);
            });
        
            for (var i = 0; i < params.length; i++) {
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
                cb(null, result);
            });
        
            connection.callProcedure(request);

        });
    }
}

exports.__default__ = db;