var constants = {
  documentStatus: {
    queued: 1,
    fetching: 2,
    split: 3,
    scoring: 4,
    processComplete: 5
  },
  queues: {
    action: {
      score: 'score',
      getPaper: 'getDocument'
    },
    fields: {
      type: "requestType",
      data: "properties",
      docId: "paperId",
      source: "documentSource",
      sourceId: "sourceId",
      sentenceIndex: "sentenceIndex",
      fromConceptTypeId: "fromConceptTypeId",
      fromConceptName: "fromConceptName",
      toConceptTypeId: "toConceptTypeId",
      toConceptName: "toConceptName",
      modelVersion: "modelVersion",
      sentenceContent: "sentence"
    },
    modelVersion: "0.1.0.1"
  }
}

module.exports = constants;
