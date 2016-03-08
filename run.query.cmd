SET setenvpath=%1
SET dontinstallnpm=%2

IF [%setenvpath%]==[] SET setenvpath=setenv.cmd

echo calling %setenvpath%
call %setenvpath%
set PIPELINE_ROLE=query-id

IF [%dontinstallnpm%]==[] call npm install
call node webjob\app.js
