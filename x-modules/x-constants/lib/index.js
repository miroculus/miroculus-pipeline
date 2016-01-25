var constants = {
  DocumentStatus: {
    Queued: 1,
    Fetching: 2,
    Split: 3,
    Scoring: 4,
    ProcessComplete: 5
  },
  Queues: {
    Action: {
      Score: 'score'
    }
  }
}

module.exports = constants;
