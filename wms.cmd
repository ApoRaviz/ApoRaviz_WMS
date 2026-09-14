@echo off
setlocal
set "WMS_NODE_DIR=%~dp0.tools\node-v24.21.0-win-x64"
if not exist "%WMS_NODE_DIR%\node.exe" (
  echo Node.js 24.21.0 is missing. See docs/PROTOTYPE-REVIEW.md.
  exit /b 1
)
set "PATH=%WMS_NODE_DIR%;%PATH%"
cd /d "%~dp0frontend"
if "%~1"=="" (
  call "%WMS_NODE_DIR%\npm.cmd" start -- --host 127.0.0.1 --port 4200
) else (
  call "%WMS_NODE_DIR%\npm.cmd" %*
)
exit /b %ERRORLEVEL%
