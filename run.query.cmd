SET setenvpath=%1
SET dontinstallnpm=%2

IF [%dontinstallnpm%]==[] call npm install
IF [%setenvpath%]==[] SET setenvpath=setenv.cmd

echo calling %setenvpath%
call %setenvpath%
set PIPELINE_ROLE=query-id
call node app_data\jobs\continuous\worker\app.js
