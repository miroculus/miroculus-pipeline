var formatters = {
    text: require('./formatters/text'),
    html: require('./formatters/html'),
    json: function(item) { return item; },
}

module.exports = function(format, item, hiddenColumns) {
    if (!(format in formatters)) format = 'text';
    return formatters[format](item, hiddenColumns);
}