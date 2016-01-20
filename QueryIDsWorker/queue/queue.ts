/*  
 * from http://odetocode.com/blogs/scott/archive/2014/04/07/azure-webjobs-with-node-js.aspx
 * */

import Q = require("q");
var azure = require("azure-storage");

export interface IQueueConfig {
    useDevelopmentStorage: boolean;
    queueName: string;
    storageName?: string;
    storageKey?: string;
}

export interface ISendMessageConfig {
    requestType: string;
    properties: {
        documentId: any,
        documentSource: string
    };
}

export class Queue {

    private _config: IQueueConfig;
    private _queueService: any;
    private _singleMessageDefaults: any;

    constructor(config: IQueueConfig) {

        this._config = config;
        var retryOperations = new azure.ExponentialRetryPolicyFilter();

        if (this._config.useDevelopmentStorage === true) {
            var devStoreCreds = azure.generateDevelopmentStorageCredendentials();
            this._queueService = azure.createQueueService(devStoreCreds);
        }
        else {
            this._queueService = azure.createQueueService(this._config.storageName, this._config.storageKey);
        }

        this._queueService = this._queueService.withFilter(retryOperations);
        this._queueService.createQueueIfNotExists(this._config.queueName, (err) => {
            if (err) {
                console.error(err);
            }
        });

        var singleMessageDefaults = { numofmessages: 1, visibilitytimeout: 2 * 60 };
    }

    public getSingleMessage = function () {
        var deferred = Q.defer();
        this._queueService.getMessages(this._config.queueName, this._singleMessageDefaults,
            this.getSingleMessageComplete(deferred));
        return deferred.promise;
    };

    public deleteMessage = function (message) {
        var deferred = Q.defer();
        this._queueService.deleteMessage(this._config.queueName, message.messageid,
            message.popreceipt, this.deleteComplete(deferred));
        return deferred.promise;
    };

    public sendMessage = function (message: ISendMessageConfig, onComplete?: any): Q.Promise<any> {
        onComplete = onComplete || Function();
        var deferred = Q.defer();
        this._queueService.createMessage(this._config.queueName, JSON.stringify(message), this.sendMessageComplete(deferred, onComplete));
        return deferred.promise;
    };

    private getSingleMessageComplete = function (deferred) {
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

    private deleteComplete = function (deferred) {
        return function (error) {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve();
            }
        };
    };

    private sendMessageComplete = function (deferred, onComplete) {
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