// this dictionary maps function names to actual log levels (from the console.xxx domain).
// we add some aliases for various levels to make life easy.
var levels = {
  'debug': 'log',
  'log': 'log',
  'verbose': 'log',
  'trace': 'log',
  'info': 'info',
  'warn': 'warn',
  'warning': 'warn',
  'error': 'error'
};

// Wights for logging levels. Lower weights for more vebose levels.
var weights = {
  'log' : 10,
  'info' : 20,
  'warn' : 30,
  'error' : 40
};

exports.normalize = function(level) {
  var level = levels[level] || 'log';
  return { level: level, weight: weights[level] };
};

function weightToLevels(weight) {
  var result = [];
  for(var key in weights) {
    if (weights[key] >= weight) {
      result.push(key);
    }
  }
  return result;
}

exports.levels = function(level) {
  return weightToLevels(exports.normalize(level).weight);
};

exports.isall = function(level) {
  return exports.normalize(level).weight <= weights.log;
}

exports.ishighp = function(level) {
  return  exports.normalize(level).weight >= weights.warn;
}

exports.isallhighp = function(level) {
  return  exports.normalize(level).weight === weights.warn;
}

exports.standard = Object.keys(weights);