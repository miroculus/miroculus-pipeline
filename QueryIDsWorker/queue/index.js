var Q = require("q");
var azure = require("azure-storage");

var QueueHandler = (function () {
    "use strict";
    
    /**
     * @typedef {Object} StorageConfig
     * @property {string} key Storage account key
     * @property {string} account Storage account name
     */

    /**
     * @typedef {Object} MessageDetails
     * @property {string} messageid identification of the message
     * @property {string} popreceipt ???
     */

    /**
    * Creates a new Queue object.
    * Requires queue name to be provided and configuration for storage account
     * 
    * @class
    * The Queue class is used to perform operations on the Microsoft Azure Queue Service.
    * 
    * @constructor
    * @augments {StorageServiceClient}
    *
    * @param {string}           [queueName]                 The name of the queue in the storage account.
    * @param {StorageConfig}    [storageConfig]             The storage configuration.
    */
    var QueueHandlerModule = function (queueName, storageConfig) {
        
        var _queueName = queueName;
        var _storageConfig = storageConfig;
        var _queueService = null;
        var _singleMessageDefaults = { numofmessages: 1, visibilitytimeout: 2 * 60 };
        var _retryOperations = new azure.ExponentialRetryPolicyFilter();
        
        _queueService = azure.createQueueService(_storageConfig.account, _storageConfig.key).withFilter(_retryOperations);
        _queueService.createQueueIfNotExists(_queueName, function (err) {
            if (err) {
                console.error(err);
            }
        });
        
        /** 
         * Get a single message from the queue
         * 
         * @returns {Promise<object>} with the data from the top of the queue
         */
        var getSingleMessage = function () {
            var deferred = Q.defer();
            _queueService.getMessages(_queueName, _singleMessageDefaults, function (error, messages) {
                if (error) {
                    deferred.reject(error);
                } else {
                    if (messages.length) {
                        deferred.resolve(messages[0]);
                    } else {
                        deferred.resolve();
                    }
                }
            });
            return deferred.promise;
        };
        
        /** 
         * Get a single message from the queue
         * 
         * @param {MessageDetails} message Message to delete details
         * 
         * @returns {Promise<object>} with the data from the top of the queue
         */
        var deleteMessage = function (message) {
            var deferred = Q.defer();
            _queueService.deleteMessage(_queueName, message.messageid , message.popreceipt, function (error) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve();
                }
            });
            return deferred.promise;
        };
        
        /** 
         * Get a single message from the queue
         * 
         * @param {Object} message Message to queue
         * @param {Object} onComplete Callback when the queuing was completed
         * 
         * @returns {Promise<object>} with the data from the top of the queue
         */
        var sendMessage = function (message, onComplete) {
            onComplete = onComplete || function () { };
            var deferred = Q.defer();
            _queueService.createMessage(_queueName, JSON.stringify(message), function (error) {
                if (error) {
                    deferred.reject(error);
                }
                else {
                    deferred.resolve();
                }
                onComplete(error);
            });
            return deferred.promise;
        };
        
        return {
            getSingleMessage: getSingleMessage,
            sendMessage: sendMessage,
            deleteMessage: deleteMessage
        };
    };
    
    return QueueHandlerModule;
}());

module.exports.QueueHandler = QueueHandler;