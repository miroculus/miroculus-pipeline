var wordwrap = require('wordwrap');
var util = require('util');

/*
* Formats a log entry for text output
*
* Sample entry:
*   level: "error",
*   message: " [\"Uncaught exception:\",\"Error: process.stderr cannot be closed\\n    at Socket.<anonymous> (node.js:293:15)\\n    at Object.afterWrite [as oncomplete] (net.js:478:10)\"]",
*   meta: {
*   time: "2012-01-12T15:48:41.383Z",
*   app: "integration.sys.integration",
*   domain: "anodejs",
*   instanceId: "anodejsrole_IN_0",
*   requestID: null,
*   stackTop: "logException (c:\\an\\repo\\integration\\node_modules\\anode\\shimme.js:67:48)"
*
*/
module.exports = function (entry, hiddenColumns) {
  hiddenColumns = hiddenColumns || [];

  var level = entry.level || 'none';
  var message = entry.message || [];
  var meta = entry.meta || {};
  var time = entry.meta.time || "0000-00-00T00:00:00.000Z";
  var app = entry.meta.app || "<unknown>";
  var domain = entry.meta.domain || "<unknown>";
  var instanceId = entry.meta.instanceId || "<unknown>";
  var requestID = entry.meta.requestID || "";
  var stackTop = entry.meta.stackTop || "";

  // make all verbose-like levels 'log'
  if (level === "debug" || level === "verbose" || level === "trace") {
    level = "log";
  }

  // split time and date and cut off milliseconds
  var timeparts = /\"(\d\d\d\d-\d\d-\d\d)T(\d\d\:\d\d\:\d\d)\.\d+Z\"/.exec(JSON.stringify(time));
  if (timeparts && timeparts.length > 2) time = timeparts[1] + " " + timeparts[2];

  // extarct instance number from instance id
  var parsedInstance = /(IN_\d+)$/.exec(instanceId);
  var instanceNumber = instanceId;
  if (parsedInstance && parsedInstance.length > 1) instanceNumber = parsedInstance[1];

  // take first portion of domain
  domain = domain.split('.')[0];

  // define field widths
  var fields = {
    level:      { width: 6,     body: level },
    timestamp:  { width: 20,    body: time },
    domain:     { width: 14,    body: domain },
    instance:   { width: 8,     body: instanceNumber },
    app:        { width: 20,    body: app },
    message:    { width: 9999,  body: message }
  };

  // format columns
  var columns = [];
  var currentColumn = 0;
  for (var k in fields) {
    if (hiddenColumns.indexOf(k) !== -1) continue;
    var field = fields[k];
    columns.push(formatColumn(field.body.toString(), currentColumn, currentColumn + field.width));
    currentColumn = currentColumn + field.width + 1;
  }

  var rows = []; // matrix rowsXcolumns
  columns.forEach(function (col) {
    var lines = col.split('\n');
    for (var rowIndex = 0; rowIndex < lines.length; ++rowIndex) {
      var line = lines[rowIndex];
      rows[rowIndex] = rows[rowIndex] || [];
      var row = rows[rowIndex];
      for (var i = 0; i < line.length; ++i) {
        // put character on row/col if there is no previous character
        if (!row[i]) row[i] = line[i];
      }
    }
  });

  // collect output
  var l = "";
  rows.forEach(function (row) {
    l += row.join('') + "\n";
  });

  return l;
};

// --- private

function formatColumn(s, start, end) {
  s = s.substring(0, end - start - 1);
  return wordwrap(start, end)(s);
}