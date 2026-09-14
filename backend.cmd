@echo off
setlocal
set "WMS_NODE_DIR=%~dp0.tools\node-v24.21.0-win-x64"
if not exist "%WMS_NODE_DIR%\node.exe" (
  echo Node 24.21.0 missing. See README.md.
  exit /b 1
)
set "PATH=%WMS_NODE_DIR%;%PATH%"
cd /d "%~dp0backend"
if "%~1"=="" (
  call npm.cmd start
) else (
  call npm.cmd %*
)
exit /b %ERRORLEVEL%
