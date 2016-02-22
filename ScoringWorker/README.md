# ScoringWorker


Calling scoring REST API:

```
Request: POST /score
{ 
	sentence: 'some sentence with gene1, gene2, gene3, mirna1, and mirna2',
	mentions: [ 
		{ type: 'gene', value: 'gene1' },
		{ type: 'gene', value: 'gene2' },
		{ type: 'mirna', value: 'mirna1' },
		{ type: 'gene', value: 'gene3' },
		{ type: 'mirna', value: 'mirna2' }
	] 
}
```

```
Response:
{ 
	modelVersion: '0.1.0.1',
	relations: [
		  {
        entity1: {
        type: 'mirna',
        name: 'mirna1'
		  },
		  entity2: {
        type: 'gene',
        name: 'gene1'
		  },
		  relation: 'relation class name',
		  score: 0.56
		},
		{
		  entity1: {
        type: 'mirna,
        name: 'mirna1'
		  },
		  entity2: {
        type: 'gene',
        name: 'gene2'
		  },
		  relation: 'relation class name',
		  score: 0.56
		},
		...
  ]
}
```

