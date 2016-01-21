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

if (!config.sql.server) throw new Error('Sql server was not provided, please add DB_SERVER to environment variables');
if (!config.sql.userName) throw new Error('Sql user was not provided, please add DB_USER to environment variables');
if (!config.sql.password) throw new Error('password for db was not provided, please add DB_PASSWORD to environment variables');
if (!config.sql.options.database) throw new Error('db name was not provided, please add DB_NAME to environment variables');

exports.sql = config.sql;
exports.storage = config.storage;
exports.queue = config.queue;