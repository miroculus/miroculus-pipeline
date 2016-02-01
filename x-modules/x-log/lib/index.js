var moment = require("moment");
var format = require("string_format");

function createMessage (msg, params) {
    var timeString = moment().format('YYYY-MM-DD HH:mm:ss');
    return timeString + ' ' + msg['format'].apply(msg, params);
}

/**
* Logging information message (using string-format to format messages)
* 
* @param {string|object} msg - message or object to log
* @param {object} params - parameters to append to the message
*/
function info (msg, params) {
    var args = [].splice.call(arguments, 1);
    console.log(createMessage(msg, args));
}

/**
* Logging a warning message (using string-format to format messages)
* 
* @param {string|object} msg - message or object to log
* @param {object} params - parameters to append to the message
*/
function warning(msg, params) {
    var args = [].splice.call(arguments, 1);
    console.warn(createMessage(msg, args));
}
    
/**
* Logging an error message (using string-format to format messages)
* 
* @param {string|object} msg - message or object to log
* @param {object} params - parameters to append to the message
*/
function error(msg, params) {
    var args = [].splice.call(arguments, 1);
    if (typeof(msg) === 'object') return console.error(msg);
    console.error(createMessage(msg, args));
}

module.exports = {
    info: info,
    warning: warning,
    error: error
};