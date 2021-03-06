# miroculus-pipeline
Miroculus pipeline components

## Deployment
1) Move to ARM mode in [azure-cli](https://azure.microsoft.com/en-us/documentation/articles/xplat-cli-install/) (It will automatically be set to deploy in your default subscription)
2) Create a new resource group
3) Create a new [parameters.prod.private.json](AzureDeployment/Templates/azuredeploy.parameters.json) file with the relevant values for deployment
4) Run deployment 
```
azure config mode arm
azure group create -n resource-group-name -l "West US"
azure group deployment create -f AzureDeployment\Templates\azuredeploy.json -e AzureDeployment\Templates\parameters.prod.private.json resource-group-name deployment-name
```

## Testing
Run tests by running
```
npm test
```

# Trigger New Document ID Check
* Push the following message to the trigger queue to initiate a new check
```
{
  "requestType": "trigger"
}
```
 
* If you want to specify a date range to check documents, use the following format
```
{
  "requestType": "trigger",
  "data": {
        "from": "2014-02-01",
        "to": "2014-02-14"
    }
}
```

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
    "modelVersion": "0.1.0.1",
    "sentence": "the sentence text...",
    "relations": [
      {
        "entity1": {
          "typeId": 2,
          "name": "mirnaX"
        },
        "entity2": {
          "typeId": 1,
          "name": "geneY"
        },
        "relation": 2,
        "score": 0.56
      },
      {
        "entity1": {
          "typeId": 2,
          "name": "mirnaX1"
        },
        "entity2": {
          "typeId": 1,
          "name": "geneY1"
        },
        "relation": 2,
        "score": 0.26
      },
      {
        "entity1": {
          "typeId": 2,
          "name": "mirnaX2"
        },
        "entity2": {
          "typeId": 1,
          "name": "geneY2"
        },
        "relation": 3,
        "score": 0.50
      }
    ]
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


