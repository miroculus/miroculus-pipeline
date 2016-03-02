azure group create -n miroculus-pipeline -l "West US"
azure group deployment create -f template.base.json -e parameters.test.json miroculus-pipeline deployment-03022016-base
timeout 60
azure group deployment create -f template.sourcecontrol.json -e parameters.test.json miroculus-pipeline deployment-03022016-sourcecontrol
