
var fs = require('fs');
var path = require('path');

var localConfigPath = path.join(__dirname, "config.private.json");
var localConfig = fs.existsSync(localConfigPath) && require(localConfigPath) || {};

var config = {
    sql: {
        server: process.env.DB_SERVER,
        userName: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: {
            database: process.env.DB_NAME,
            encrypt: true
        }
    },
    storage: {
        account: process.env.STORAGE_ACCOUNT,
        key: process.env.STORAGE_KEY
    }
};

if (!config.sql.server) throw new Error('Sql server was not provided, please add DB_SERVER to environment variables');
if (!config.sql.userName) throw new Error('Sql user was not provided, please add DB_USER to environment variables');
if (!config.sql.password) throw new Error('password for db was not provided, please add DB_PASSWORD to environment variables');
if (!config.sql.options.database) throw new Error('db name was not provided, please add DB_NAME to environment variables');


//if (!config.storage.account) throw new Error('storage account was not provided, please add STORAGE_ACCOUNT to environment variables');
//if (!config.storage.key) throw new Error('storage key was not provided, please add STORAGE_KEY to environment variables');


module.exports = config;
