var db = require('../common/db');
var log = require('../common/log');
var config = require('../config');
var tedious = require('tedious');

// Todo: This class seemingly only inserts a new document to the data base without upload (should change name?)
var PaperUpserter = (function () {
    "use strict";
    
    var TYPES = tedious.TYPES;

    /**
     * Upload a document's content to the sql database and insert a new row to orepresent it
     * 
     * @param {string}      [paperId]       The id of the paper to insert
     * @param {string}      [paperName]     The web source for the document
     * @param {string}      [paperSouce]    The web source for the document
     * @param {function}    [callback]      Callback for when the upsert was completed
     */
    function upsertPaper(paperId, paperName, paperSouce, callback) {
        
        return db.getDataSets(config.sql, {
            sproc: 'UpsertDocument',
            sets: ['data'],
            params: [
                { name: 'Id', type: TYPES.VarChar, value: paperId },
                { name: 'Description', type: TYPES.VarChar, value: paperName },
                { name: 'Source', type: TYPES.VarChar, value: paperSouce }
            ]
        }, function (err, result) {
            
            if (err) {
                log.error(err);
                return callback(err);
            }

            log.info("Upserted document <{}> successfully", paperId);
            
            return callback(result);
        });
    }
    

    return {
        upsertPaper: upsertPaper
    };

}());

module.exports = PaperUpserter;