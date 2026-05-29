@echo off
setlocal enabledelayedexpansion
title ACHME CRM - How to Access the System
color 0B

:: ====================================================================
:: PATHS & PORTS
:: ====================================================================
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

:refresh_loop
:: ====================================================================
:: DETECT LAN IP and HOSTNAME DYNAMICALLY
:: First try reading saved .last-build-ip, then detect live
:: ====================================================================
set "LAN_IP=127.0.0.1"

:: Try reading saved IP from last build
if exist "%ROOT%\.last-build-ip" (
  set /p LAN_IP=<"%ROOT%\.last-build-ip"
)

:: Also detect live via ipconfig (pure batch string manipulation - no pipe bug!)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
  set "CANDIDATE=%%a"
  set "CANDIDATE=!CANDIDATE: =!"
  set "PREFIX1=!CANDIDATE:~0,4!"
  set "PREFIX2=!CANDIDATE:~0,8!"
  if not "!PREFIX1!"=="127." (
    if not "!PREFIX2!"=="169.254." (
      set "LAN_IP=!CANDIDATE!"
      goto :got_ip
    )
  )
)
:got_ip

set "PC_HOSTNAME=localhost"
for /f "usebackq tokens=*" %%h in (`hostname`) do set "PC_HOSTNAME=%%h"
if "%PC_HOSTNAME%"=="" set "PC_HOSTNAME=localhost"

cls
echo.
echo  =========================================================================
echo    ACHME CRM  ^|  ACCESS GUIDE  (DYNAMIC DETECTION)
echo  =========================================================================
echo.
echo    Active Server Hostname : %PC_HOSTNAME%
echo    Active Server LAN IP   : %LAN_IP%
echo    Service Port           : 82
echo.
echo  =========================================================================
echo    1. ACCESSING FROM THE SERVER PC (THIS MACHINE)
echo  =========================================================================
echo.
echo      Localhost URL :  http://localhost:82
echo      Loopback URL  :  http://127.0.0.1:82
echo      Hostname URL  :  http://%PC_HOSTNAME%:82
echo      Direct IP URL :  http://%LAN_IP%:82
echo.
echo  =========================================================================
echo    2. ACCESSING FROM OTHER DEVICES ON THE LAN (EMPLOYEE PCs and MOBILES)
echo  =========================================================================
echo.
echo      [Always Works] Direct IP URL :  http://%LAN_IP%:82
echo      [Local Name]   Hostname URL  :  http://%PC_HOSTNAME%:82
echo.
echo      [Easy Domain]  Premium URLs  :  http://achme.com
echo                                      http://www.achme.com
echo.
echo    * Note: To use achme.com / www.achme.com on employee devices, run
echo      "employee-hosts-setup.bat" on that employee's PC (needs Admin).
echo.
echo  =========================================================================
echo    LIVE HEALTH CHECK
echo  =========================================================================
echo.

curl -s --max-time 4 http://localhost:82/nginx-health >nul 2>&1
if errorlevel 1 (
  echo    [!!]  Nginx  (port 82) - NOT RESPONDING  ^<-- run start-servers.bat
) else (
  echo    [OK]  Nginx  (port 82) - RUNNING
)

curl -s --max-time 4 http://localhost:5000/api/health >nul 2>&1
if errorlevel 1 (
  echo    [!!]  Backend (port 5000) - NOT RESPONDING  ^<-- run start-servers.bat
) else (
  echo    [OK]  Backend (port 5000) - RUNNING
)

echo.
echo  =========================================================================
echo    ADMIN LOGIN:  Kk@achmecommunication.com  /  kk@admin@123
echo  =========================================================================
echo.
echo    Share the Direct IP URL with employees:  http://%LAN_IP%:82
echo    They can bookmark it or run employee-hosts-setup.bat for achme.com
echo.
echo  =========================================================================
echo.
echo    Press ANY KEY to refresh status/IP... (Ctrl+C to exit)
echo  =========================================================================
echo.
pause >nul
goto :refresh_loop
