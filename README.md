# miroculus-pipeline
Miroculus pipeline components

# Getting Documents ID Worker
* Get Ids
* Filter using filtering stored procedure
* Push all Ids to queue

```
TODO: Mor to edit how the message looks like in the queue
```

# Fetching documents Worker
* Get item from queue
* Insert document record to db with status Processing
* Fetch document
* Split to sentences, do some processing
* push sentences to scoring queue

```
{
  "requestType": "score",
  "data": {
    "sourceId": "sourceId",
    "docId": "docId",
    "sentenceIndex": 1,
    "fromConceptId": 1,
    "fromConceptName": "geneX",
    "toConceptId": 2,
    "toConceptName": "mirnaY",
    "sentence": "the sentence text..."
  }
}
```

* Change document status to Scoring
* Delete item from queue

# Scoring Worker
a.	Get items from scoring queue
b.	Score and insert sentences to DB
c.	Delete items from queue
d.	Update document status to Processed


