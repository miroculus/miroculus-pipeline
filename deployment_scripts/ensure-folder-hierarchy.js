var fs = require('fs');
var path = require('path');

console.info('Remove irrelevant folders');
// Remove app.js of the web job if this is a website (this will remove the web job completely)
if (process.env.DEPLOYMENT_ROLE === 'website') {

  // Remove website app.js if this is a webjob
  var appPath = path.join(process.env.DEPLOYMENT_TARGET, 'app_data', 'jobs', 'continuous', 'worker', 'app.js');
  console.info('Deleting web jobs folder', appPath);
  
  if (fs.existsSync(appPath)) fs.unlinkSync(appPath);
}

console.info('Remove irrelevant folders completed');