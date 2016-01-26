var constants = {
  documentStatus: {
    PROCESSING: 1,
    SCORING: 2,
    PROCESSED: 3
  },
  sources: {
    PUBMED: 1,
    PMC: 2
  },
  ConceptTypes: {
    GENE: 1,
    SPECIES: 2,
    MIRNA: 3,
    CHEMICAL: 4,
    OTHER: 5,
  },
  queues: {
    action: {
      SCORE: 'score'
      GET_DOCUMENT: 'getDocument'
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
