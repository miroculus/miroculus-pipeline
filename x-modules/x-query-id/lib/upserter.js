var log = require('x-log');
var db = require('x-db');
var config = require('x-config');
var tedious = require('tedious');

var TYPES = tedious.TYPES;

// Todo: This class seemingly only inserts a new document to the data base without upload (should change name?)

/**
* Upload a document's content to the sql database and insert a new row to orepresent it
* 
* @param {string}      [paperId]       The id of the paper to insert
* @param {string}      [paperName]     The web source for the document
* @param {string}      [paperSouce]    The web source for the document
* @param {function}    [callback]      Callback for when the upsert was completed
*/
function upsertDocument(docId, docName, docSouce, callback) {
    
    return db.getDataSets(config.sql, {
        sproc: 'UpsertDocument',
        sets: ['data'],
        params: [
            { name: 'Id', type: TYPES.VarChar, value: docId },
            { name: 'Description', type: TYPES.VarChar, value: docName },
            { name: 'Source', type: TYPES.VarChar, value: docSouce }
        ]
    }, function (err, result) {
        
        if (err) {
            log.error(err);
            return callback(err);
        }

        log.info("Upserted document <{}> successfully", docId);
        
        return callback(result);
    });
}

module.exports = {
    upsertDocument: upsertDocument
};