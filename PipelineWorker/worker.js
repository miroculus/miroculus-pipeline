
console.log('env variables', process.env);

var db = require('./db');


setInterval(function () {
    console.log('executing');
    db.executeStatement1(function (err) { 
        if (err) console.error('error:', err);
    });
}, 5000);