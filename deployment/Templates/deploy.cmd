REM azure group create -n [resource group name] -l "West US"
call azure group create -n miroculus-pipeline -l "West US"

REM azure group deployment create -f template.base.json -e parameters.test.json [resource group name] deployment-03012016-base
call azure group deployment create -f template.base.json -e parameters.test.json miroculus-pipeline deployment-03012016-base
timeout 60

REM azure group deployment create -f template.sourcecontrol.json -e parameters.test.json [resource group name] deployment-03012016-sourcecontrol
call azure group deployment create -f template.sourcecontrol.json -e parameters.test.json miroculus-pipeline deployment-03012016-sourcecontrol
