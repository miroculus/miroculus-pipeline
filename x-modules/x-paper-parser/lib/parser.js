
/**
    * Get a text from a full document at return an array of sentenses
    * Todo: This should be turned to a query to giovanny's API 
    * 
    * @param   {string}      [text] - Text to parse
    * @returns {string[]}           - sentenses array
    */
var turnTextToSentenses = function (text) {
    return text.match(/\S.*?\."?(?=\s|$)/g);
};

module.exports = {
    turnTextToSentenses: turnTextToSentenses
};