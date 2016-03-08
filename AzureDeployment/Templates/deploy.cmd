call azure group create -n miroculus-pipeline-prod -l "West US"

call azure group deployment create -f azuredeploy.json -e parameters.prod.private.json miroculus-pipeline-prod deployment-03012016-base
timeout 20

call azure group deployment create -f azuredeploy.sourcecontrol.json -e parameters.prod.private.json miroculus-pipeline-prod deployment-03012016-sourcecontrol
