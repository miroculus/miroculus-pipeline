var text = require('./text');
var sanitize = require('validator').sanitize;

module.exports = function(entry, hiddenColumns) {
    var line = text(entry, hiddenColumns);
    return '<pre class="' + entry.level + '">' + sanitize(line).entityEncode() + '</pre>';
};
