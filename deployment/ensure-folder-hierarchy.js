var fse = require('fs-extra');
var path = require('path');

console.info('Checking if should create web job folders');

// If this process\application is a web job, copy app.js to a folder 
// where the web job in Azure expects it to be under:
// site_root\app_data\jobs\continuous\worker\app.js
//
// This will ensure the web job will be created\updated automatically
// On each deployment.
if (process.env.DEPLOYMENT_ROLE === 'webjob') {
  
  var sourceFile = path.join('webjob', 'app.js');
  var targetFile = path.join('app_data', 'jobs', 'continuous', 'worker', 'app.js');
  
  // If the web job already exists, delete it (ensures the web job will restart in Azure)
  if (fse.existsSync(targetFile)) fse.removeSync(targetFile);

  fse.ensureLinkSync(sourceFile, targetFile);

  console.info('Remove irrelevant folders completed');
}