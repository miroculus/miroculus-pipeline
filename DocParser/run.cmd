call setenv.cmd
call xcopy ..\x-modules\* node_modules\ /EFY
call node worker.js
