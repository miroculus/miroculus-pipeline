console.log('env variables', process.env);

import db = require('./db');
import retriever = require("./retriever/pmcWrapper");


setInterval(function () {
    console.log('executing ts');
    retriever.getPapers();
    //db.executeStatement1(function (err) {
    //    if (err) console.error('error:', err);
    //});
}, 5000);