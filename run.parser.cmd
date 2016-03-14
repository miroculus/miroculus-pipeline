SET setenvpath=%1
SET dontinstallnpm=%2

IF [%setenvpath%]==[] SET setenvpath=setenv.cmd

echo calling %setenvpath%
call %setenvpath%
set PIPELINE_ROLE=paper-parser

IF [%dontinstallnpm%]==[] call npm install
call node webjob\app.js
