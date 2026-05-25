@echo off
setlocal
title ACHME CRM - Live Launcher Alias

set "ROOT=%~dp0"

if not exist "%ROOT%start_live_nginx_pm2.bat" (
  echo.
  echo [FAIL] start_live_nginx_pm2.bat was not found beside this file.
  echo        Keep all ACHME project files together, then run this again.
  echo.
  pause
  exit /b 1
)

call "%ROOT%start_live_nginx_pm2.bat"
if errorlevel 1 (
    echo.
    echo [FAIL] Live Launcher finished with error code %ERRORLEVEL%
    pause
)
exit /b %ERRORLEVEL%
