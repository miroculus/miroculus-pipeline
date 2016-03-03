var fs = require('fs');
var path = require('path');
var tedious = require('tedious');
var TYPES = tedious.TYPES;
var configSql = require('../../config').sql;


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


function deploySchema(cb) {

        try {

            var file = path.join(__dirname, 'schema2.sql');
            var script = fs.readFileSync(file, {encoding: 'ucs2'}).replace(/GO/g, '').replace(/\n/g, '');


            connect(function (err, connection) {
                if (err) {
                    console.error('error deploying schema', err);
                    cb(err);
                }

                console.log('running', script);
                var request = new tedious.Request(script, function(err) {
                    if (err) {
                        console.error(err);
                        return cb(err);
                    }
                    console.log('request completed successfully');

                    return cb();
                });

                connection.execSql(request);
            });












            return cb();



            var scripts = script.split('GO');

            for(var i=0; i<10; i++) {

                (function(script) {

                    connect(function (err, connection) {
                        if (err) {
                            console.error('error deploying schema', err);
                            cb(err);
                        }

                        console.log('running', script);
                        var request = new tedious.Request(script, function(err) {
                            if (err) {
                                console.error(err);
                                return cb(err);
                            }
                            console.log('request completed successfully');

                            return cb();
                        });

                        connection.execSql(request);
                    });
                })(scripts[i]);
            }
        }
        catch (err) {
            return cb(err);
        }
}


deploySchema(function(err){

    console.log('deployment completed successfully');
});

