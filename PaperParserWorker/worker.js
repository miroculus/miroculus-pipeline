console.log('paper parser worker started');

var paperParser = require('x-paper-parser');

paperParser.run(function (err) {
    if (err) return console.error('error running paper parser worker:', err);
    console.info('paper parser worker exit');
});