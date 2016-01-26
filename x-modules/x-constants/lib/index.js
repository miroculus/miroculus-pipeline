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
  conceptTypes: {
    GENE: 1,
    SPECIES: 2,
    MIRNA: 3,
    CHEMICAL: 4,
    OTHER: 5,
  },
  queues: {
    action: {
      SCORE: 'score',
      GET_DOCUMENT: 'getDocument'
    },
    modelVersion: "0.1.0.1"
  }
}

module.exports = constants;
