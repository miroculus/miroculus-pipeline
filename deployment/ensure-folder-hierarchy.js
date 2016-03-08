var fse = require('fs-extra');
var path = require('path');

console.info('Checking if should create web job folders');

// Remove app.js of the web job if this is a website (this will remove the web job completely)
if (process.env.DEPLOYMENT_ROLE !== 'website') {
  
  var sourceFile = path.join('webjob', 'app.js');
  var targetFile = path.join('app_data', 'jobs', 'continuous', 'worker', 'app.js');
  
  if (fse.existsSync(targetFile)) fse.removeSync(targetFile);

  fse.ensureLinkSync(sourceFile, targetFile);

  console.info('Remove irrelevant folders completed');
}