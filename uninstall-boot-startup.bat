@echo off
setlocal enabledelayedexpansion
title ACHME CRM - Complete Uninstaller ^& Service Stopper
color 0C

:: ====================================================================
:: CONFIGURATION
:: ====================================================================
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

:: ====================================================================
:: ADMIN AUTO-ELEVATION (required to delete schtasks, firewall, services)
:: ====================================================================
net session >nul 2>&1
if errorlevel 1 (
  echo  [!] Requesting Administrator privileges...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b 0
)

cls
echo.
echo  ===========================================================================
echo     ACHME CRM  ^|  COMPLETE UNINSTALLER ^& SERVICE STOPPER
echo  ===========================================================================
echo.
echo     This script will:
echo       1. Stop and delete the PM2 Backend service and daemon
echo       2. Terminate the Nginx reverse proxy
echo       3. Deregister all automatic Boot/Logon Scheduled Tasks
echo       4. Remove inbound Firewall security rules
echo       5. Clean up temporary tracking files
echo.
echo     (Note: MySQL server is left running to protect other databases)
echo  ===========================================================================
echo.
set /p "CONFIRM=  Are you sure you want to stop all services and uninstall? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
  echo  [!] Uninstallation cancelled. Exiting...
  timeout /t 3 >nul
  exit /b 0
)
echo.

:: ====================================================================
:: STEP 1: Stop and Delete PM2 Backend Service
:: ====================================================================
echo  [1/5] Stopping and deleting PM2 backend...

:: Add Node.js and global npm prefix to path if saved files exist
if exist "%ROOT%\.achme-node-dir" (
  for /f "usebackq tokens=*" %%a in ("%ROOT%\.achme-node-dir") do set "ACHME_NODE_DIR=%%a"
  set "PATH=!ACHME_NODE_DIR!;!PATH!"
)
if exist "%ROOT%\.achme-npm-prefix" (
  for /f "usebackq tokens=*" %%a in ("%ROOT%\.achme-npm-prefix") do set "ACHME_NPM_PREFIX=%%a"
  set "PATH=!ACHME_NPM_PREFIX!;!PATH!"
)
if exist "%ROOT%\.achme-pm2-home" (
  for /f "usebackq tokens=*" %%a in ("%ROOT%\.achme-pm2-home") do set "PM2_HOME=%%a"
)

:: Scan other locations for pm2 if not found
set "PM2_EXEC="
if exist "%ACHME_NPM_PREFIX%\pm2.cmd" set "PM2_EXEC=%ACHME_NPM_PREFIX%\pm2.cmd"
if not defined PM2_EXEC (
  where pm2 >nul 2>&1
  if not errorlevel 1 (
    for /f "tokens=*" %%p in ('where pm2 2^>nul') do if not defined PM2_EXEC set "PM2_EXEC=%%p"
  )
)
if not defined PM2_EXEC (
  for /d %%u in ("C:\Users\*") do (
    if exist "%%u\AppData\Roaming\npm\pm2.cmd" (
      if not defined PM2_EXEC set "PM2_EXEC=%%u\AppData\Roaming\npm\pm2.cmd"
    )
  )
)

if defined PM2_EXEC (
  echo        Found PM2 at: !PM2_EXEC!
  call "!PM2_EXEC!" stop achme-backend >nul 2>&1
  call "!PM2_EXEC!" delete achme-backend >nul 2>&1
  call "!PM2_EXEC!" save --force >nul 2>&1
  call "!PM2_EXEC!" kill >nul 2>&1
  echo        PM2 backend service stopped and daemon terminated. [OK]
) else (
  echo        PM2 executable not found. Backend might not be running via PM2. [SKIP]
)
echo.

:: ====================================================================
:: STEP 2: Stop Nginx Reverse Proxy
:: ====================================================================
echo  [2/5] Stopping Nginx reverse proxy...
taskkill /F /IM nginx.exe >nul 2>&1
if errorlevel 1 (
  echo        Nginx was not running or already stopped. [OK]
) else (
  echo        Nginx processes terminated successfully. [OK]
)
echo.

:: ====================================================================
:: STEP 3: Remove Scheduled Tasks
:: ====================================================================
echo  [3/5] Deregistering automatic Boot and Logon scheduled tasks...

schtasks /delete /tn "ACHME_CRM_AutoBoot" /f >nul 2>&1
if errorlevel 1 (
  echo        SYSTEM Boot task "ACHME_CRM_AutoBoot" not found.
) else (
  echo        SYSTEM Boot task "ACHME_CRM_AutoBoot" removed successfully. [OK]
)

schtasks /delete /tn "ACHME_CRM_Login_Startup" /f >nul 2>&1
if errorlevel 1 (
  echo        Login Fallback task "ACHME_CRM_Login_Startup" not found.
) else (
  echo        Login Fallback task "ACHME_CRM_Login_Startup" removed successfully. [OK]
)

:: Legacy tasks cleanup
schtasks /delete /tn "ACHME_CRM_Boot_Startup" /f >nul 2>&1
schtasks /delete /tn "ACHME_CRM_Logon_Dashboard" /f >nul 2>&1
schtasks /delete /tn "ACHME_CRM_Boot_Startup_Local" /f >nul 2>&1

:: Clean user session legacy shortcuts
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if exist "%STARTUP_DIR%\ACHME CRM Startup.cmd" del "%STARTUP_DIR%\ACHME CRM Startup.cmd" >nul 2>&1
if exist "%STARTUP_DIR%\achme-startup.lnk" del "%STARTUP_DIR%\achme-startup.lnk" >nul 2>&1

echo        All automatic startup tasks removed. [OK]
echo.

:: ====================================================================
:: STEP 4: Remove Firewall Rules
:: ====================================================================
echo  [4/5] Removing Windows Firewall rules...
netsh advfirewall firewall delete rule name="ACHME CRM Port 82" >nul 2>&1
netsh advfirewall firewall delete rule name="ACHME CRM Port 5000" >nul 2>&1
echo        Firewall rules deleted. [OK]
echo.

:: ====================================================================
:: STEP 5: Clean Up Tracking and Configuration Files
:: ====================================================================
echo  [5/5] Cleaning up temporary tracking files...
for %%f in (.achme-node-dir .achme-npm-prefix .achme-pm2-home .last-build-ip .last-build-stamp) do (
  if exist "%ROOT%\%%f" (
    del "%ROOT%\%%f" >nul 2>&1
    echo        File %%f removed.
  )
)
echo        Tracking file cleanup complete. [OK]
echo.

echo  ===========================================================================
echo     UNINSTALLATION ^& SERVICE CLEANUP COMPLETED!
echo  ===========================================================================
echo     All ACHME CRM background services (Nginx, PM2, and Schedulers) 
echo     have been completely STOPPED, REMOVED, and CLEANED UP.
echo.
echo     Press any key to close...
echo  ===========================================================================
pause >nul
exit /b 0
