# Document Processing Pipeline
A pipeline that receives a public repository on one side, 
performs entity extraction and scoring on that document and outputs the data in the form of a graph.

This module consists of 5 major components meant to do the following workflow
>       Public external document repository 
>       ==> [Query web job] Query documents on date range
>           ==> [Parser web job - Role 1] Divide documents into sentences
>               ==> [Parser web job - Role 2] Perform entity extraction on sentences
>                   ==> [Scoring web job] Score sentences in relation to entities
*__TODO: Add a diagram of the pipeline__*

# Table of contents
* [Components](#components)
    * [Web Jobs](#web-jobs)
    * [Logging](#logging)
    * [Console](#console)
    * [Graph API](#graph-api)
* [Testing](#testing)
    * [Prerequisites](#prerequisites)
    * [Running Tests Locally](#running-tests-locally)
* [Deployment](#deployment)
    * [Running locally](#running-locally)
        * [Local Environment Prerequisites](#local-environment-prerequisites)
    * [Azure Deployment](#azure-deployment)
        * [Deploy with ARM](#deploy-with-arm)
            * [Deployment parameteres](#deployment-parameteres)
* [License](#license)

# Components
## Web Jobs
There are 3 web jobs in the bundle

| Web Job      | Description                           |
| ------------ | ------------------------------------- |
|__Query__     |Query documents according to date range provided through <br>*Trigger Queue* and insert all unprocessed documents to *New IDs Queue*
|__Parser__    |Processes each document in *New IDs Queue* into <br>sentences and entities and pushes them into *Scoring Queue*
|__Scoring__   |Scores each sentence in *Scoring Queue* via the *Scoring Service*

To get more information on the message api between the web jobs and the queues see [Document Processing Pipeline - Message API](websites/console/docs/queues.md)

## Logging
The web jobs output their logs into two mediums:
* __nodejs console__ - which is accessible via *Azure Portal > Relevant Web App > Web Jobs > worker > Logs Url*
* __console web app__ - see [Console](##console)

## Console
This web app is deployed as part of the solution. For more information see [Console - Managing and Monitoring the Pipeline](websites/console/docs/console.md)

## Graph API
Used to expose the output of the pipeline.
Mainly designed to be used by the loom tool to get the entities and the relations.

# Testing
## Prerequisites
To run the tests locally, create a `setenv.test.cmd` file at the root of your repository. You can copy it from `env.template.cmd` as a template.

For local run parameters see [Local Run Parameters](websites/console/docs/local-params.md)

## Running Tests Locally
Initiate tests by running:
```
npm install
npm test
```

# Deployment
The deployment files are available under AzureDeployment and use ARM template deployment to perform deploy the environment and continuous deployment.

## Running Locally
Create a `setenv.cmd` file at the root of your repository. You can copy it from `env.template.cmd` as a template.

For local run parameters see [Local Run Parameters](websites/console/docs/local-params.md)

### Local Environment Prerequisites
* Sql Server, Database, login name and password (schema is available in [Schema.sql](deployment/sql/schema.sql))
* Azure storage account name and key for queues
* Azure storage account name and key for logging (can use the same one as for queues)
* Service URLs for: Document processing, Scoring
* [Enable Google Authentication](websites/console/docs/google-auth.md)

## Azure Deployment
Create a `AzureDeployment/Templates/azuredeploy.parameters.private.json` file with your configuration and passwords. 
You can use `AzureDeployment/Templates/azuredeploy.parameters.json` file as a reference.

### Prerequisites
* An active azure subscription
* Service URLs for: Document processing, Scoring
* [Enable Google Authentication](websites/console/docs/google-auth.md) on the **console web app** url
* [Set Up Git](https://help.github.com/articles/set-up-git/)

To edit the deployment parameters see [Azure Deployment Parameters](websites/console/docs/azure-params.md)
**TODO - There should be no prerequisites to the project**
**1) Remove project dependencies**
**2) Enable user/password authentication to prevent dependency on google authentication**

### Deploy with ARM
Install <a href="https://azure.microsoft.com/en-us/documentation/articles/xplat-cli-install/" target="_blank">azure-cli</a> and change mode to ARM
```
npm install -g azure-cli
azure config mode arm
```
List all subscriptions and see the currently set subscription.<br>
In case you need to change the subscription, use `azure account set`.
```
azure account list
azure account show
azure account set db7d4b48-13ee-4c4a-a0e2-c98c29df0cab
```
To deploy the template to azure, use the following:
```
azure group create -n resource-group-name -l "West US"
azure group deployment create -f AzureDeployment\Templates\azuredeploy.json -e AzureDeployment\Templates\parameters.prod.private.json resource-group-name deployment-name
```

To deploy continuous integration run
```
azure group deployment create -f AzureDeployment\Templates\azuredeploy.sourcecontrol.json -e AzureDeployment\Templates\parameters.prod.private.json resource-group-name deployment-sourcecontrol-name
```
> **Notice 1**: The deployment templates have been divided into two since currently, deploying node continuous deployment with ARM can appear to fail*

> **Notice 2**: Even though continuous deployment may appear to fail, this might be the result of network errors with npm and might actually work*

#### Deployment parameteres
* `resource-group-name` - You can use an existing resource group or run `azure group create` to create a new resource group.
* `deployment-name` - The name for the deployment which you can later monitor through and azure cli or the azure portal.

# License
Document Processing Pipeline is licensed under the [MIT License](LICENSE).
