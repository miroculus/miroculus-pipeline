var fs = require('fs');
var path = require('path');

console.info('Remove irrelevant folders');

var deleteFolderRecursive = function (path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file, index) {
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

// Remove webjobs folder if this is a website
if (process.env.DEPLOYMENT_ROLE !== 'website') {
  
  var serverPath = path.join(process.env.DEPLOYMENT_TARGET, 'server.js');
  console.info('Deleting server.js from', serverPath);
  
  fs.unlinkSync(serverPath);
} else {

  // Remove website folder if this is a webjob
  var appDataPath = path.join(process.env.DEPLOYMENT_TARGET, 'app_data');
  console.info('Deleting web jobs folder', appDataPath);
  
  deleteFolderRecursive(appDataPath);
}

console.info('Remove irrelevant folders completed');