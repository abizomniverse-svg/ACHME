@echo off
title ACHME CRM - Live Status Dashboard
color 0B
mode con: cols=92 lines=30

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

:loop
cls
:: Resolve LAN IP dynamically inside the loop
set "LAN_IP=127.0.0.1"
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$ip = (Find-NetRoute -RemoteIPAddress '8.8.8.8' -ErrorAction SilentlyContinue | Select-Object -First 1).LocalIPAddress; if (-not $ip) { $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notmatch 'vEthernet|Loopback|Bluetooth' } | Select-Object -First 1).IPAddress }; $ip"`) do set "LAN_IP=%%i"

:: Resolve IP DHCP Mode (Static vs Dynamic)
set "IP_MODE=Unknown"
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$adapter = Get-NetIPInterface -AddressFamily IPv4 | Where-Object { $_.ConnectionState -eq 'Connected' -and $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Virtual|Bluetooth' } | Select-Object -First 1; if ($adapter.Dhcp -eq 'Disabled') { 'STATIC (IP Frozen)' } else { 'DYNAMIC (DHCP - IP might change!)' }"`) do set "IP_MODE=%%i"

:: Enforce PM2_HOME path
if not defined PM2_HOME (
  if exist "C:\Users\thana\.pm2" (
    set "PM2_HOME=C:\Users\thana\.pm2"
  ) else if exist "%USERPROFILE%\.pm2" (
    set "PM2_HOME=%USERPROFILE%\.pm2"
  )
)

:: Find PM2 executable
set "PM2_EXEC=pm2"
where pm2 >nul 2>&1
if errorlevel 1 (
  if exist "C:\Users\thana\AppData\Roaming\npm\pm2.cmd" (
    set "PM2_EXEC=C:\Users\thana\AppData\Roaming\npm\pm2.cmd"
  ) else if exist "%APPDATA%\npm\pm2.cmd" (
    set "PM2_EXEC=%APPDATA%\npm\pm2.cmd"
  ) else if exist "%USERPROFILE%\AppData\Roaming\npm\pm2.cmd" (
    set "PM2_EXEC=%USERPROFILE%\AppData\Roaming\npm\pm2.cmd"
  )
)

echo ==========================================================================================
echo    ___   ___ _  _ __  __ ___    ___ ___  __  __
echo   / _ \ / __^| ^|_^| ^|  \/  ^| __^|  / __^| _ \^|  \/  ^|
echo  ^| (_) ^| (__^|  _  ^| ^|    ^| ^| _^|  ^| (__^|   /^| ^|  ^| ^|
echo   \___/ \___^|_^| ^|_^|_^|\/^|_^|___^|  \___^|_^|_\\^|_^|  ^|_^|
echo.
echo   LIVE SYSTEM SERVICE MONITOR (AUTOMATIC STARTUP ACTIVE)
echo ==========================================================================================
echo.
echo   [SYSTEM DETECTED IP ^& PORT STATUS]
echo   ----------------------------------------------------------------------------------------
echo   ➜ FRONTEND PORT:  82  (Nginx / Nginx Proxy)
echo   ➜ BACKEND PORT:   5000 (Express Node Server)
echo.
echo   ➜ LOCAL URL:      http://localhost:82
echo   ➜ LAN ACCESS URL:  http://%LAN_IP%:82
echo   ➜ LAN IP STATUS:   %IP_MODE%
echo   ----------------------------------------------------------------------------------------
echo.
echo   [PM2 ACTIVE PROCESS STATUS]
echo   ----------------------------------------------------------------------------------------
if exist "%PM2_EXEC%" (
  call "%PM2_EXEC%" list
) else (
  where pm2 >nul 2>&1
  if not errorlevel 1 (
    pm2 list
  ) else (
    echo [WARN] PM2 was not found. Headless monitor bypassed.
  )
)
echo   ----------------------------------------------------------------------------------------
echo.
echo   This window monitors the active status of the ACHME CRM services.
echo   Auto-refreshing status in 10 seconds... (Press Ctrl+C to stop monitor)
timeout /t 10 >nul
goto loop
