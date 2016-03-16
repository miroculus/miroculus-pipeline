# Console - Managing and Monitoring the Pipeline
[This document is part of [Document Processing Pipeline](../../../README.md)]

The **Console Application** is an application that enables you to view the state of your system without connecting to the services directly.

How does it happen?

When each web job start it runs the following command in `webjob/app.js`:
```
var log = require('pl-log');
...
log.init({
      domain: process.env.COMPUTERNAME || '',
      instanceId: log.getInstanceId(),
      app: workerName,
      level: config.log.level,
      transporters: config.log.transporters
    },
      function(err) {
        if (err) return handleError(err);
        console.log('starting %s worker...', workerName);

        return runWorker();
      });
```

The `log.init` method, replaces the object of `console` with a new object that enables logging into **Azure Tables** and `console` together.
Logging into **Azure Tables** enables the **Console Application** to query the state of **Logs** outputted by the different roles and processes.

In addition, the usage of [Plugins](#console-plugins) (a.k.a extensions) enables you add application specific functionality to the **Console Application**. 
Using that feature, it is also possible to view the state of **Queues** and **Database Tables** in the pipeline, and how many messages are queued to be handled by which web job in the pipeline.

# Running Locally
To get started with **Console Application** locally, run `run.console.cmd` from the root of the Github repository.
and navigate to `http://localhost:3000`.

# Examples for commands
## Getting help
Use the `help` command to list the available commands in the system and their information or `help log` for example to get help on a specific command.
```
help
help log
```
## Managing My Application
```
man app
```
**TODO - How to change default application**
## Querying For Logs
To query for log  messages you can use the following examples:

Query messages for since a certain date\time:
```
log --since "2016-03-10 20:25:09"
log -s "2016-03-10 20:25:09"
```
Query logs for different apps (the default app is written at the beginning of the console line: "[Mor Shemesh\console]>"):
```
log --app "query-id" 
```
Logs containing text in their message:
```
log --app "query-id" --message "checking queue" 
```
Query logs from a certain level:
```
log --app "query-id" --level info
log --app "query-id" -l error 
```
## Check Pipeline State
This command enables you to see how many document/sentences are currently waiting in the pipeline for processing + how many documents/sentences/relations/entities are currently in the database. 
```
pipeline status
```
Resulting in a message like this:
```
70         ==>  query-id       
256        ==>  paper-parser   
3          ==>  scoring        
------------------------------
[  Documents ]: 2381
[  Sentences ]: 37
[  Relations ]: 2316
[  Entities  ]: 101
```
# Console Plugins
To see more help on how to dynamically add more plugins to your **Console Application** use the following command:
```
man plugins
```