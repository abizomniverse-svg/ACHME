@echo off
setlocal enabledelayedexpansion
title ACHME CRM - Uninstall Automatic Windows Boot & Logon Startup

echo.
echo ====================================================================
echo  ACHME CRM - AUTOMATIC WINDOWS BOOT ^& LOGON STARTUP UNINSTALLER
echo ====================================================================
echo.

:: 1. Verify Administrator Privileges
net session >nul 2>&1
if errorlevel 1 (
  echo.
  echo ❌ ERROR: Administrator privileges are required!
  echo.
  echo Please right-click this file "uninstall-boot-startup.bat"
  echo and select "Run as Administrator" to authorize task removal.
  echo.
  pause
  exit /b 1
)

:: 2. Delete the Boot Scheduled Task
echo ⚙️ [1/3] Removing Windows Boot Scheduled Task...
schtasks /delete /tn "ACHME_CRM_Boot_Startup" /f >nul 2>&1
if errorlevel 1 (
  echo ℹ️ Windows Boot Task "ACHME_CRM_Boot_Startup" was not found or already removed.
) else (
  echo  👉 [SUCCESS] Windows Boot Scheduled Task removed successfully!
)
echo.

:: 3. Delete the Logon Scheduled Task
echo ⚙️ [2/3] Removing Windows Logon Scheduled Task...
schtasks /delete /tn "ACHME_CRM_Logon_Dashboard" /f >nul 2>&1
if errorlevel 1 (
  echo ℹ️ Windows Logon Task "ACHME_CRM_Logon_Dashboard" was not found or already removed.
) else (
  echo  👉 [SUCCESS] Windows Logon Scheduled Task removed successfully!
)
echo.

:: 4. Delete Logon Shortcut from the User Startup Folder (Legacy fallback cleanup)
echo ⚙️ [3/3] Checking legacy User Session Logon Startup shortcuts...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_CMD=%STARTUP_DIR%\ACHME CRM Startup.cmd"

if exist "%STARTUP_CMD%" (
  del "%STARTUP_CMD%" >nul 2>&1
  echo  👉 [SUCCESS] Legacy User session logon runner removed successfully!
) else (
  echo ℹ️ No legacy logon runner shortcuts found.
)

echo.
echo ====================================================================
echo  UNINSTALLATION COMPLETED SUCCESSFULLY!
echo ====================================================================
echo.
echo  Automatic startup has been completely disabled.
echo.
pause
exit /b 0
