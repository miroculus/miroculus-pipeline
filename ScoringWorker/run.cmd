SET setenvpath=%1

IF [%setenvpath%]==[] SET setenvpath=..\setenv.cmd

call npm install
echo calling %setenvpath%
call %setenvpath%
for /f "delims=" %%a in ('dir /b/ad "..\NodeWorkersEditor\node_modules\x-*" ') do call xcopy "..\NodeWorkersEditor\node_modules\%%a\*" "node_modules\%%a" /EFYI
call node worker.js
