/*  
 * from http://odetocode.com/blogs/scott/archive/2014/04/07/azure-webjobs-with-node-js.aspx
 * */

var Q = require("q");
var azure = require("azure-storage");

var Queue = function (queueName, storageConfig) {
    
    var _queueName = queueName;
    var _storageConfig = storageConfig;
    var _queueService = null;
    var _singleMessageDefaults = null;
    
    var retryOperations = new azure.ExponentialRetryPolicyFilter();
    var singleMessageDefaults = { numofmessages: 1, visibilitytimeout: 2 * 60 };
    
    _queueService = azure.createQueueService(_storageConfig.account, _storageConfig.key).withFilter(retryOperations);
    _queueService.createQueueIfNotExists(_queueName, function (err) {
        if (err) {
            console.error(err);
        }
    });
    
    this.getSingleMessage = function () {
        var deferred = Q.defer();
        _queueService.getMessages(_queueName, _singleMessageDefaults,
            this.getSingleMessageComplete(deferred));
        return deferred.promise;
    };
    
    this.deleteMessage = function (message) {
        var deferred = Q.defer();
        _queueService.deleteMessage(_queueName, message.messageid,
            message.popreceipt, this.deleteComplete(deferred));
        return deferred.promise;
    };
    
    this.sendMessage = function (message, onComplete) {
        onComplete = onComplete || Function();
        var deferred = Q.defer();
        _queueService.createMessage(_queueName, JSON.stringify(message), this.sendMessageComplete(deferred, onComplete));
        return deferred.promise;
    };
    
    getSingleMessageComplete = function (deferred) {
        return function (error, messages) {
            if (error) {
                deferred.reject(error);
            } else {
                if (messages.length) {
                    deferred.resolve(messages[0]);
                } else {
                    deferred.resolve();
                }
            }
        };
    };
    
    deleteComplete = function (deferred) {
        return function (error) {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve();
            }
        };
    };
    
    sendMessageComplete = function (deferred, onComplete) {
        onComplete = onComplete || Function();
        return function (error) {
            if (error) {
                deferred.reject(error);
            }
            else {
                deferred.resolve();
            }
            onComplete(error);
        };
    };
}

module.exports = Queue;