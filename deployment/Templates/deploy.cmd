call azure group create -n miroculus-pipeline-morshe -l "West US"

call azure group deployment create -f template.base.json -e parameters.test.json miroculus-pipeline-morshe deployment-03012016-base
timeout 20

call azure group deployment create -f template.sourcecontrol.json -e parameters.test.json miroculus-pipeline-morshe deployment-03012016-sourcecontrol
