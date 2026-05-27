@echo off
setlocal enabledelayedexpansion
title ACHME CRM - Employee Device Setup
color 0A

:: STEP 1: Verify and request Administrator privileges
net session >nul 2>&1
if not errorlevel 1 (
    goto :admin_authenticated
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

echo ====================================================================
echo  ACHME CRM - EMPLOYEE DEVICE SETUP UTILITY
echo ====================================================================
echo.
echo  This script will configure your PC to access the CRM using:
echo  http://achme.com
echo.

set "SERVER_IP=192.168.0.115"

echo  [1/2] Mapping achme.com to server IP (%SERVER_IP%)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$hostsFile = \"$env:SystemRoot\System32\drivers\etc\hosts\"; ^
  $domains = @('achme.com', 'www.achme.com'); ^
  $content = Get-Content $hostsFile; ^
  $filtered = $content | Where-Object { $line = $_.Trim(); $match = $false; foreach($d in $domains) { if ($line -match \"\\b$d\\b\") { $match = $true } }; -not $match }; ^
  $newMappings = @( ^
  \"%SERVER_IP%    achme.com    www.achme.com\" ^
  ); ^
  $filtered + $newMappings | Set-Content $hostsFile -Force; ^
  Write-Host '  [OK] Local DNS hosts successfully mapped to CRM server!' -ForegroundColor Green;"

echo.
echo  [2/2] Flushing DNS resolver cache...
ipconfig /flushdns >nul
echo   [OK] DNS Cache flushed.
echo.
echo ====================================================================
echo  SUCCESS! SETUP COMPLETE.
echo ====================================================================
echo.
echo  You can now open your browser and access the CRM at:
echo  http://achme.com
echo.
pause
exit /b 0
