# miroculus-pipeline
Miroculus pipeline components

# Getting Documents ID Worker
* Get Ids of new documents from both pmc and pubmed databases
* Filter new Ids using filtering stored procedure
* Push all Ids to queue

```
{
  "requestType": "getDocument",
  "data": {
        "docId": "docId",
        "sourceId": "pmc"
    }
}
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
    "sourceId": 1,
    "docId": "docId",
    "sentenceIndex": 1,
    "fromConceptTypeId": 1,
    "fromConceptName": "geneX",
    "toConceptTypeId": 2,
    "toConceptName": "mirnaY",
    "modelVersion": "0.1.0.1",
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


