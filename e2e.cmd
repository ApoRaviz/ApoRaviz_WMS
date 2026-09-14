@echo off
setlocal
set "WMS_NODE_DIR=%~dp0.tools\node-v24.21.0-win-x64"
set "PATH=%WMS_NODE_DIR%;%PATH%"
"%WMS_NODE_DIR%\node.exe" "%~dp0scripts\run-e2e.mjs"
exit /b %ERRORLEVEL%
