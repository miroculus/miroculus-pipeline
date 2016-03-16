call azure group create -n miroculus-pipeline-staging -l "West US"

call azure group deployment create -f azuredeploy.json -e parameters.staging.private.json miroculus-pipeline-staging deployment-03012016-base
timeout 20

call azure group deployment create -f azuredeploy.sourcecontrol.json -e parameters.staging.private.json miroculus-pipeline-staging deployment-03012016-sourcecontrol
