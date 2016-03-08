var util = require('util');
var config = require('../lib/config');
var writer = require('..').writer;

exports.tests = {
    setUp: function(cb) {
        // create the writer
        this.writer = writer({ domain: 'mydomain', host: 'myhost', app: 'myapp' });

        // remove the transports
        this.writer.winston.remove({ name: 'mongodb' });
        this.writer.winston.remove({ name: 'simple-console' });

        // add 'queue' transport which buffers results into an array
        this.writer.winston.add(QueueTransport);

        return cb();
    },

    //
    // verify most of the fields
    //
    fields: function(test) {
        this.writer.info('hello, world - info, %d', 100, { obj: 123 });
        var actual = QueueTransport.dequeue();
        test.equals(actual.level, 'info');
        test.equals(actual.msg, 'hello, world - info, 100 { obj: 123 }');
        test.equals(actual.meta.app, 'myapp');
        test.equals(actual.meta.domain, 'mydomain');
        test.equals(actual.meta.host, 'myhost');
        test.ok(!actual.meta.requestID);
        test.deepEqual(actual.meta.args, [ 'hello, world - info, %d', 100, { obj: 123 } ]);
        test.ok(!!~actual.meta.stackTop.indexOf('writer.test.js'));
        test.done();
    },
    
    //
    // verify that request id is taken from first argument
    //
    requestID: function(test) {
        this.writer.info('[this-is-request-id]', 'message 1234');
        var actual = QueueTransport.dequeue();
        test.equals(actual.meta.requestID, '[this-is-request-id]');
        test.done();
    },

    //
    // verify various log levels
    //
    levels: function(test) {
        this.writer.warn('da');
        test.equals(QueueTransport.dequeue().level, 'warn');

        this.writer.warning('da');
        test.equals(QueueTransport.dequeue().level, 'warn');

        this.writer.info('da');
        test.equals(QueueTransport.dequeue().level, 'info');

        this.writer.error('da');
        test.equals(QueueTransport.dequeue().level, 'error');

        this.writer.log('da');
        test.equals(QueueTransport.dequeue().level, 'verbose');

        this.writer.verbose('da');
        test.equals(QueueTransport.dequeue().level, 'verbose');

        test.done();
    },
        
    //
    // test interceptor
    //
    interceptor: function(test) {

        // intercept console.xxx into writer.xxx
        var ic = require('..').interceptor;
        ic.replace(console, this.writer);
        console.error('hello, world', 1234);
        ic.restore(console);

        // assert
        var actual = QueueTransport.dequeue();
        test.equals(actual.level, 'error');
        test.equals(actual.msg, 'hello, world 1234');
        test.equals(actual.meta.domain, 'mydomain');
        test.equals(actual.meta.host, 'myhost');
        test.ok(!actual.meta.requestID);
        test.deepEqual(actual.meta.args, [ 'hello, world', 1234 ]);
        test.ok(!!~actual.meta.stackTop.indexOf('writer.test.js'));

        test.done();
    },

    directWrite: function(test) {
        var actual;

        //
        // just message with level
        //

        this.writer.write({ level: 'info', msg: 'hello' });
        actual = QueueTransport.dequeue();
        test.equals(actual.level, 'info');
        test.equals(actual.msg, 'hello');
        test.equals(actual.meta.app, 'myapp');
        test.equals(actual.meta.domain, 'mydomain');
        test.equals(actual.meta.host, 'myhost');
        test.deepEqual(actual.meta.args, []);

        //
        // override domain, host, app
        //

        this.writer.write({ level: 'info', msg: 'hello', domain: 'yourdomain', app: 'yourapp', host: 'yourhost' });
        actual = QueueTransport.dequeue();
        test.equals(actual.level, 'info');
        test.equals(actual.msg, 'hello');
        test.equals(actual.meta.app, 'yourapp');
        test.equals(actual.meta.domain, 'yourdomain');
        test.equals(actual.meta.host, 'yourhost');
        test.deepEqual(actual.meta.args, []);

        //
        // args, stacktop, reqid
        //

        this.writer.write({ level: 'info', msg: 'hello', args: [1,2,3], stackTop: 'hello,stacktop', requestID: 'myreqid' });
        actual = QueueTransport.dequeue();
        test.equals(actual.level, 'info');
        test.equals(actual.msg, 'hello');
        test.equals(actual.meta.app, 'myapp');
        test.equals(actual.meta.requestID, 'myreqid');
        test.equals(actual.meta.domain, 'mydomain');
        test.equals(actual.meta.stackTop, 'hello,stacktop');
        test.equals(actual.meta.host, 'myhost');
        test.deepEqual(actual.meta.args, [1,2,3]);

        test.done();
    }
};

//
// verify that the mongodb transport is configured properly
//
exports.testMongoTransport = function(test) {
    var wr = writer();
    test.ok(wr.winston.transports.mongodb);
    test.equals(wr.winston.transports.mongodb.host, config.host);
    test.equals(wr.winston.transports.mongodb.port, config.port);
    test.equals(wr.winston.transports.mongodb.db, config.database);
    test.done();
};

// -- private

// winston transport which queues entries into an array
function QueueTransport() {
    var api = new process.EventEmitter();
    api.level = 'verbose'; // log all levels
    api.log = function(level, msg, meta, callback) {
        QueueTransport.queue.push({
            level: level,
            msg: msg,
            meta: meta,
            callback: callback
        });

        return callback();
    };
    return api;
}

QueueTransport.queue = [];
QueueTransport.dequeue = function() { return QueueTransport.queue.shift(); };
