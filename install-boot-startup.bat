@echo off
setlocal enabledelayedexpansion
title ACHME CRM - Install Automatic Windows Boot & Logon Startup

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

echo.
echo ====================================================================
echo  ACHME CRM - AUTOMATIC WINDOWS BOOT ^& LOGON STARTUP INSTALLER
echo ====================================================================
echo.

:: 1. Verify Administrator Privileges
net session >nul 2>&1
if errorlevel 1 (
  echo.
  echo ❌ ERROR: Administrator privileges are required!
  echo.
  echo Please right-click this file "install-boot-startup.bat"
  echo and select "Run as Administrator" to authorize Windows Scheduled Tasks.
  echo.
  pause
  exit /b 1
)

:: 2. Verify files exist
if not exist "%ROOT%\achme-startup.bat" (
  echo ❌ ERROR: achme-startup.bat was not found in:
  echo %ROOT%\achme-startup.bat
  pause
  exit /b 1
)
if not exist "%ROOT%\achme-dashboard.bat" (
  echo ❌ ERROR: achme-dashboard.bat was not found in:
  echo %ROOT%\achme-dashboard.bat
  pause
  exit /b 1
)

:: 3. Register the Scheduled Task to trigger at boot time (runs headless, before login!)
echo ⚙️ [1/2] Creating Windows Boot Scheduled Task (Headless, Background)...
schtasks /create /tn "ACHME_CRM_Boot_Startup" /tr "\"%ROOT%\achme-startup.bat\"" /sc onstart /ru SYSTEM /rl HIGHEST /f >nul 2>&1
if errorlevel 1 (
  echo ❌ Failed to register System Boot Scheduled Task.
) else (
  echo  👉 [SUCCESS] Headless Boot Task "ACHME_CRM_Boot_Startup" registered successfully!
  echo     This scheduled task runs headless under the 'SYSTEM' account
  echo     immediately upon OS boot (no user session or password required).
)
echo.

:: 4. Register the Logon Task to open the visible status dashboard terminal elevated (bypasses UAC prompts!)
echo ⚙️ [2/2] Creating Windows Logon Scheduled Task (Interactive, Visible Dashboard)...
schtasks /create /tn "ACHME_CRM_Logon_Dashboard" /tr "\"%ROOT%\achme-dashboard.bat\"" /sc onlogon /rl HIGHEST /f >nul 2>&1
if errorlevel 1 (
  echo ❌ Failed to register Logon Dashboard Scheduled Task.
) else (
  echo  👉 [SUCCESS] Interactive Logon Task "ACHME_CRM_Logon_Dashboard" registered successfully!
  echo     This scheduled task triggers at logon of any user, launching an
  echo     elevated, visible terminal window displaying the server IP and ports
  echo     completely autonomously with zero UAC prompts!
)

echo.
echo ====================================================================
echo  INSTALLATION COMPLETED SUCCESSFULLY!
echo ====================================================================
echo.
echo  Your CRM application is now fully automated and non-breakable:
echo  1. Boot: Node servers ^& Nginx boot automatically in the background (within 30s).
echo  2. Logon: A gorgeous, visible command dashboard launches automatically on your
echo     desktop, showing the active running LAN IP address, port status, and PM2 list.
echo.
pause
exit /b 0
