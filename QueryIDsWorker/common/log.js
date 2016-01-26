require("string_format");
var moment = require("moment");

var log = (function () {
    "use strict";
    
    var createMessage = function (msg, params) {
        var timeString = moment().format('YYYY-MM-DD HH:mm:ss');
        var message = msg;

        if (typeof message === 'string') {
            message = timeString + ' ' + message.format(params);
        } else {
            message = timeString + ' ' + message + (params ? ' ' + params : '');
        }
        return message;
    };

    /**
     * Logging information message (using string-format to format messages)
     * 
     * @param {string|object} msg - message or object to log
     * @param {object} params - parameters to append to the message
     */
    var info = function (msg, params) {
        console.log(createMessage(msg, params));
    };
    
    /**
     * Logging an error message (using string-format to format messages)
     * 
     * @param {string|object} msg - message or object to log
     * @param {object} params - parameters to append to the message
     */
    var error = function (msg, params) {
        console.error(createMessage(msg, params));
    };

    return {
        info: info,
        error: error
    };
}());

module.exports = log;