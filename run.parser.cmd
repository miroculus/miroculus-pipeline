SET setenvpath=%1
SET dontinstallnpm=%2

IF [%dontinstallnpm%]==[] call npm install
IF [%setenvpath%]==[] SET setenvpath=setenv.cmd

echo calling %setenvpath%
call %setenvpath%
set PIPELINE_ROLE=paper-parser
call node webjob\app.js
