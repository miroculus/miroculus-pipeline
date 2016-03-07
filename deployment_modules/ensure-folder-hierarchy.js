var fs = require('fs');
var path = require('path');

console.info('Remove irrelevant folders');

// Remove webjobs folder if this is a website
if (process.env.DEPLOYMENT_ROLE !== 'website') {
  
  var serverPath = path.join(process.env.DEPLOYMENT_TARGET, 'server.js');
  console.info('Deleting server.js from', serverPath);
  
  fs.unlinkSync(serverPath);
} else {

  // Remove website folder if this is a webjob
  var appDataPath = path.join(process.env.DEPLOYMENT_TARGET, 'app_data');
  console.info('Deleting web jobs folder', appDataPath);
  
  fs.rmdirSync(appDataPath);
}

console.info('Remove irrelevant folders completed');