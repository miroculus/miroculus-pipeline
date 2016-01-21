module.exports = {
    info: function (msg, params) {
        if (typeof params !== 'undefined') {
            console.log(msg, params);
        } else {
            console.log(msg);
        }
    },

    error: function (msg, params) {
        if (typeof params !== 'undefined') {
            console.error(msg, params);
        } else {
            console.error(msg);
        }
    }
}