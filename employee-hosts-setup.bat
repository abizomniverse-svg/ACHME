@echo off
setlocal enabledelayedexpansion
title ACHME CRM - Employee Device Setup
color 0A

:: ================================================================
:: ACHME CRM - EMPLOYEE DEVICE HOSTS SETUP
::
:: Run this on each EMPLOYEE's PC to access the CRM via domain name.
:: Right-click -> Run as Administrator (interactive mode)
::
:: SILENT MODE (used by start-servers.bat on the server):
::   employee-hosts-setup.bat /silent
::   No windows, no prompts, logs to logs\
:: ================================================================

set "SILENT_MODE=0"
if /I "%~1"=="/silent" set "SILENT_MODE=1"

:: ---- SERVER IP CONFIGURATION ----
:: First try to auto-read from .last-build-ip saved by start-servers.bat
:: Fallback to last known static IP of the IBM-SERVER
set "SERVER_IP=192.168.1.110"
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

if exist "%ROOT%\.last-build-ip" (
  set /p SERVER_IP=<"%ROOT%\.last-build-ip"
)

:: If running as employee script (no .last-build-ip nearby), use hardcoded IP
:: The admin should update this line if the server IP ever changes:
if "%SERVER_IP%"=="" set "SERVER_IP=192.168.1.110"

:: Auto-elevate to Administrator if needed
net session >nul 2>&1
if not errorlevel 1 goto :admin_authenticated

if "%SILENT_MODE%"=="1" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -ArgumentList '/silent' -Verb RunAs -WindowStyle Hidden"
  exit /b 0
)

echo.
echo  ================================================================
echo   ELEVATING TO ADMINISTRATOR PRIVILEGES...
echo   Required to update the hosts file for ACHME CRM access.
echo  ================================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
exit /b 0

:admin_authenticated
cd /d "%~dp0"
set "LOG_DIR=%ROOT%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
set "LOG=%LOG_DIR%\employee-hosts-setup.log"

if "%SILENT_MODE%"=="1" goto :silent_mode

:: ================================================================
:: INTERACTIVE MODE
:: ================================================================
cls
echo.
echo  ================================================================
echo   ACHME CRM - EMPLOYEE DEVICE SETUP UTILITY
echo  ================================================================
echo.
echo   This will configure your PC to access ACHME CRM using:
echo     http://achme.com
echo     http://www.achme.com
echo     http://IBM-SERVER:82
echo     http://%SERVER_IP%:82
echo.
echo   Server IP: %SERVER_IP%
echo.
echo  ================================================================
echo.

:: [1/4] Update hosts file
echo [1/4] Updating hosts file...
call :do_update_hosts
echo   [OK] Hosts file updated.
echo.

:: [2/4] Flush DNS
echo [2/4] Flushing DNS cache...
ipconfig /flushdns >nul
echo   [OK] DNS cache flushed.
echo.

:: [3/4] Connectivity test
echo [3/4] Testing connectivity to server...
echo.
echo   Testing http://%SERVER_IP%:82 ...
cmd /c "curl -s --max-time 5 http://%SERVER_IP%:82/nginx-health >nul 2>&1"
if errorlevel 1 (
  echo    [WARN] http://%SERVER_IP%:82 not responding. Check server is running.
) else (
  echo    [OK]  http://%SERVER_IP%:82 is reachable!
)

echo.
echo   Testing http://achme.com:82 ...
cmd /c "curl -s --max-time 5 http://achme.com:82/nginx-health >nul 2>&1"
if errorlevel 1 (
  echo    [WARN] http://achme.com:82 not responding (may need a moment).
) else (
  echo    [OK]  http://achme.com:82 is reachable!
)

echo.
echo   Testing http://IBM-SERVER:82 ...
cmd /c "curl -s --max-time 5 http://IBM-SERVER:82/nginx-health >nul 2>&1"
if errorlevel 1 (
  echo    [WARN] http://IBM-SERVER:82 not responding (may need a moment).
) else (
  echo    [OK]  http://IBM-SERVER:82 is reachable!
)

echo.
echo  ================================================================

:: [4/4] Show current hosts entries
echo [4/4] Your hosts file now contains:
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content \"$env:SystemRoot\System32\drivers\etc\hosts\" | Where-Object { $_ -match 'achme|IBM-SERVER' -and $_.Trim() -notlike '#*' } | ForEach-Object { Write-Host ('    ' + $_) }"
echo.

echo  ================================================================
echo   SETUP COMPLETE!
echo  ================================================================
echo.
echo   You can now access ACHME CRM from this PC:
echo.
echo     http://achme.com         (recommended)
echo     http://www.achme.com     (recommended)
echo     http://%SERVER_IP%:82    (direct IP - always works)
echo     http://IBM-SERVER:82     (server name)
echo.
pause
exit /b 0

:: ================================================================
:: SILENT MODE — runs hidden, logs everything
:: ================================================================
:silent_mode
echo [%DATE% %TIME%] Silent employee-hosts-setup started >>"%LOG%"
call :do_update_hosts >>"%LOG%" 2>&1
ipconfig /flushdns >nul
echo [%DATE% %TIME%] Hosts file updated and DNS flushed for SERVER_IP=%SERVER_IP% >>"%LOG%"
exit /b 0

:: ================================================================
:: SHARED SUBROUTINE: DO_UPDATE_HOSTS
:: Maps achme.com, www.achme.com, IBM-SERVER to SERVER_IP
:: ================================================================
:do_update_hosts
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$hostsFile = \"$env:SystemRoot\System32\drivers\etc\hosts\";" ^
  "$domains = @('achme.com', 'www.achme.com', 'IBM-SERVER', 'IBM-SERVER.achme.com');" ^
  "$content = [System.IO.File]::ReadAllLines($hostsFile);" ^
  "$filtered = $content | Where-Object { $line = $_.Trim(); $keep = $true; foreach($d in $domains) { if ($line -match ('(?i)\b' + [regex]::Escape($d) + '\b')) { $keep = $false; break } }; $keep };" ^
  "$ip = '%SERVER_IP%';" ^
  "$newMappings = @(" ^
  "    ''," ^
  "    '# ACHME CRM Employee Setup (auto-updated %DATE%)'," ^
  "    ($ip + '    achme.com    www.achme.com')," ^
  "    ($ip + '    IBM-SERVER   IBM-SERVER.achme.com')" ^
  ");" ^
  "[System.IO.File]::WriteAllLines($hostsFile, ($filtered + $newMappings));" ^
  "Write-Host ('  [OK] Hosts mapped: achme.com + IBM-SERVER -> ' + $ip) -ForegroundColor Green;"
exit /b 0
