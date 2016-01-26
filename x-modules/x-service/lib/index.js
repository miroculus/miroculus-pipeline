// TODO: rename x-service

var log = require("x-log");
var Q = require("q");
var service = require('./ncbiService.js');
var async = require('async');

// Mock function, it needs to put the paperid in a queue to 
// be downloaded and proccesed
var getDocumentContent = function (docId, source) {
    var deferred = Q.defer();

    service.fetchContent(source, docId, function (error, content) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(content);
        }
    });

    return deferred.promise;
};

module.exports = {
    getDocumentContent: getDocumentContent
};