set ProjectDir=%1
set ConfigurationName=%2

for /f "delims=" %%a in ('dir /b/ad "%ProjectDir%\..\NodeWorkersEditor\node_modules\x-*" ') do (
	echo Copying x-modules to Scoring worker
	xcopy "%ProjectDir%..\NodeWorkersEditor\node_modules\%%a\*" "%ProjectDir%obj\%ConfigurationName%\ScoringWorker\node_modules\%%a" /EFYI
	xcopy "%ProjectDir%..\NodeWorkersEditor\node_modules\%%a\*" "%ProjectDir%csx\%ConfigurationName%\roles\ScoringWorker\approot\node_modules\%%a" /EFYI
	
	echo Copying x-modules to Paper Parser worker
	xcopy "%ProjectDir%..\NodeWorkersEditor\node_modules\%%a\*" "%ProjectDir%obj\%ConfigurationName%\DocParser\node_modules\%%a" /EFYI
	xcopy "%ProjectDir%..\NodeWorkersEditor\node_modules\%%a\*" "%ProjectDir%csx\%ConfigurationName%\roles\DocParser\approot\node_modules\%%a" /EFYI
	
	echo Copying x-modules to Query ID worker
	xcopy "%ProjectDir%..\NodeWorkersEditor\node_modules\%%a\*" "%ProjectDir%obj\%ConfigurationName%\QueryIDs\node_modules\%%a" /EFYI
	xcopy "%ProjectDir%..\NodeWorkersEditor\node_modules\%%a\*" "%ProjectDir%csx\%ConfigurationName%\roles\QueryIDs\approot\node_modules\%%a" /EFYI
)