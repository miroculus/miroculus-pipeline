
// TODO: remove fields

var constants = {
  apps: {
    QUERY: 'query-id',
    PARSER: 'paper-parser',
    SCORING: 'scoring'
  },
  documentStatus: {
    PROCESSING: 1,
    SCORING: 2,
    PROCESSED: 3,
    NOT_ACCESSIBLE: 4
  },
  sources: {
    PUBMED: 1,
    PMC: 2,
    GENERAL: 100
  },
  sourcesById: {
    1: 'pubmed',
    2: 'pmc'
  },
  conceptTypes: {
    GENE: 1,
    MIRNA: 2,
    SPECIES: 3,
    CHEMICAL: 4,
    OTHER: 5
  },
  entitiesName: {
    GENE: 'gene',
    MIRNA: 'mirna'
  },
  queues: {
    action: {
      TRIGGER: 'trigger',
      SCORE: 'score',
      LAST_ITEM_TO_SCORE: 'lastItemToScore',
      GET_DOCUMENT: 'getDocument',
      RESCORE: 'rescore',
      REPROCESS: 'reprocess'
    }
  },
  
  logMessages: {
    query: {
      doneQueuing: 'Testable>> done queuing messages for all documents',
      queueDocFormat: 'Testable>> Queued document %s from source %s'
    },
    parser: {
      doneQueuingFormat: 'Testable>> done queuing messages for document <%s>'
    }
  }
}

constants.conceptTypesById = {};
for (var key in constants.conceptTypes) {
  constants.conceptTypesById[constants.conceptTypes[key]] = key;
}

module.exports = constants;
