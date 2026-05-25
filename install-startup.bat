@echo off
setlocal
title ACHME CRM - Install Windows Startup

set "ROOT=%~dp0"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_CMD=%STARTUP_DIR%\ACHME CRM Startup.cmd"
set "SILENT_MODE=0"

if /I "%~1"=="--silent" set "SILENT_MODE=1"

if not exist "%ROOT%achme-startup.bat" (
  echo [FAIL] achme-startup.bat was not found beside this file.
  if "%SILENT_MODE%"=="1" exit /b 1
  pause
  exit /b 1
)

if not exist "%STARTUP_DIR%" mkdir "%STARTUP_DIR%"

(
echo @echo off
echo call "%ROOT%achme-startup.bat"
) > "%STARTUP_CMD%"

echo.
echo ACHME CRM startup installed for this Windows user.
echo It will restore PM2 and Nginx after login.
echo.
echo Startup file:
echo %STARTUP_CMD%
echo.
if "%SILENT_MODE%"=="1" exit /b 0
pause
exit /b 0
