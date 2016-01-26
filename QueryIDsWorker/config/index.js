require("string_format");

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
    },
    queue: {
        scoring: process.env.QUEUE_SCORING,
        new_ids: process.env.QUEUE_NEW_IDS
    }
};

function checkParam(paramValue, paramInfo, paramKey) {
    "use strict";

    if (!paramValue) {
        var errorFormat = '{} was not provided, please add {} to environment variables';
        throw new Error(errorFormat.format(paramInfo, paramKey));
    }
}

checkParam(config.sql.server, 'Sql server', 'DB_SERVER');
checkParam(config.sql.userName, 'Sql user', 'DB_USER');
checkParam(config.sql.password, 'password for db', 'DB_PASSWORD');
checkParam(config.sql.options.database, 'db name', 'DB_NAME');
checkParam(config.queue.new_ids, 'new ids queue', 'QUEUE_NEW_IDS');

module.exports = config;