SET setenvpath=%1

IF NOT [%setenvpath%]==[] SET setenvpath=..\%setenvpath%

cd ScoringWorker
start run.cmd %setenvpath%
cd ..

cd QueryIDs
start run.cmd %setenvpath%
cd ..

cd DocParser
start run.cmd %setenvpath%
cd ..



