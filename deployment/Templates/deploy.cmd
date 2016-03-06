call azure group create -n miroculus-pipeline-amitu1 -l "West US"

call azure group deployment create -f template.base.json -e parameters.prod.json miroculus-pipeline-amitu1 deployment-03012016-base
timeout 20

call azure group deployment create -f template.sourcecontrol.json -e parameters.prod.json miroculus-pipeline-amitu1 deployment-03012016-sourcecontrol
