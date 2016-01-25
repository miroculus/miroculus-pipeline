var constants = {
  DocumentStatus: {
    PROCESSING: 1,
    SCORING: 2,
    PROCESSED: 3
  },
  Sources: {
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
  Queues: {
    Action: {
      SCORE: 'score'
    }
  }
}

module.exports = constants;
