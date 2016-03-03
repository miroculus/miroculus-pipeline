var utils = require('./test/utils.js');
var path = require('path');

console.info('running script...')
utils.runDBScript(path.join('Sql', 'sql.sql'), function (err) {
  if (err) return console.error('Error while running the script:', err);
  
  console.info('completed Successfully');
})