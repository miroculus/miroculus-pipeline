
exports.params = [
    {
        "short": "a",
        "name": "app",
        "type": "string",
        "desc": "Filter by full app name (indexed). Example: -a rp.sys"
    },
    {
        "short": "l",
        "name": "level",
        "type": "string",
        "options": ["error", "warn", "info", "log"],
        "desc": "Maximum level to include (error < warn < info < log) [log]",
        "defaultValue": "log"
    },
    {
        "short": "f",
        "name": "farm",
        "type": "string",
        "desc": "Filter by farm (indexed). Full name should be used. Example: -d anodejs"
    },
    {
        "short": "i",
        "name": "instance",
        "type": "string",
        "desc": "Filter by instance ID (not indexed). Example: -i IN_2"
    },
    {
        "short": "s",
        "name": "since",
        "type": "date",
        "desc": "Query limit records since that date (indexed). Uses Date.parse(). Example: -s 2012-01-19 15:30"
    },
    {
        "short": "u",
        "name": "until",
        "type": "date",
        "desc": "Query limit records until that date (indexed). Uses Date.parse(). Example: -u 2012-01-19 15:30"
    },
    {
        "short": "t",
        "name": "transport",
        "type": "string",
        "desc": "Transport name (azuretable or mongo)"
    },
    {
        "name": "message",
        "type": "string",
        "desc": "Filter by message content (not indexed)"
    },
    {
        "name": "format",
        "type": "string",
        "options": ["text", "html", "json"],
        "desc": "Output format [text]",
        "defaultValue": "text"
    },
    {
        "name": "skip",
        "type": "int",
        "desc": "Number of entries to skip [0]",
        "defaultValue": 0
    },
    {
        "name": "limit",
        "type": "int",
        "desc": "Number of entries to return [100]",
        "defaultValue": 100
    },
    {
        "name": "top",
        "type": "int",
        "desc": "Number of entries to return [100]",
        "defaultValue": 100
    },
    {
        "name": "nocolors",
        "desc": "Do not color output"
    }
];

exports.instanceNormalization = function(instance) {
  var matchedInstance = /IN_\d+$/.exec(instance);
  return matchedInstance ? matchedInstance[0] : instance;
}