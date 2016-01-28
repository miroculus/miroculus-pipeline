
/**
    * Get a text from a full document at return an array of sentences
    * Todo: This should be turned to a query to giovanny's API 
    * 
    * @param   {string}      [text] - Text to parse
    * @returns {string[]}           - sentences array
    */
var turnTextToSentences = function (text) {
    return text.match(/\S.*?\."?(?=\s|$)/g);
};

module.exports = {
    turnTextToSentences: turnTextToSentences
};