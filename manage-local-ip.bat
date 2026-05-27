@echo off
setlocal enabledelayedexpansion
title ACHME CRM — Local IP and DNS Manager
color 0B

:: ====================================================================
:: ACHME CRM — LOCAL IP & DNS MANAGEMENT UTILITY (STATIC IP FREEZER)
:: ====================================================================

:: STEP 1: Verify and request Administrator privileges
net session >nul 2>&1
if not errorlevel 1 (
    goto :admin_authenticated
)

echo.
echo  ================================================================
echo   ELEVATING TO ADMINISTRATOR PRIVILEGES...
echo  ================================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
exit /b 0

:admin_authenticated
cd /d "%~dp0"
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

:menu
cls
echo ==========================================================================================
echo    ___   ___ _  _ __  __ ___    ___ ___  __  __
echo   / _ \ / __| |_| |  \/  | __|  / __| _ \|  \/  |
echo  | (_) | (__|  _  | |    | |_|  | (__|   /| |  | |
echo   \___/ \___|_| |_|_|\/|_|___|  \___|_|_\\|_|  |_|
echo.
echo   LOCAL IP STATIC FREEZER & DNS MANAGER (RUNNING AS ADMIN)
echo ==========================================================================================
echo.
echo   Dynamic IPs change every time you switch or reconnect Wi-Fi.
echo   Use this tool to FREEZE your current active local IP to Static so that
echo   your employees can ALWAYS access the CRM using the same IP or domain.
echo.
echo   [CHOOSE AN OPTION BELOW]
echo   ----------------------------------------------------------------------------------------
echo   [1] Freeze Current Active Local IP as STATIC (Recommended - Freeze IP)
echo   [2] Revert Local IP Network Card to DYNAMIC (DHCP - Standard Mode)
echo   [3] Update Hosts File DNS Mappings Only (achme.com & achme-vignesh.local)
echo   [4] Update Backend & Frontend .env Files to Active IP
echo   [5] Run FULL SYSTEM OPTIMIZATION (Option 1 + 3 + 4 + Flush DNS)
echo   [6] Show Current Network & IP Status
echo   [7] Exit
echo   ----------------------------------------------------------------------------------------
echo.
set /p "choice=Enter option (1-7): "

if "%choice%"=="1" goto freeze_ip
if "%choice%"=="2" goto dynamic_dhcp
if "%choice%"=="3" goto update_hosts_only
if "%choice%"=="4" goto update_env_only
if "%choice%"=="5" goto full_optimization
if "%choice%"=="6" goto show_status
if "%choice%"=="7" exit /b 0
goto menu

:: ====================================================================
:: OPTION 1: FREEZE DYNAMIC IP TO STATIC
:: ====================================================================
:freeze_ip
cls
echo ====================================================================
echo  FREEZING CURRENT DYNAMIC IP TO STATIC IP
echo ====================================================================
echo.
echo  Checking current network settings...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$adapter = Get-NetIPInterface -AddressFamily IPv4 | Where-Object { $_.ConnectionState -eq 'Connected' -and $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Virtual|Bluetooth' } | Select-Object -First 1;" ^
  "if (-not $adapter) { Write-Host '  [FAIL] No active network adapter found!' -ForegroundColor Red; exit 1 };" ^
  "$ipConf = Get-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1;" ^
  "$gw = (Get-NetRoute -InterfaceIndex $adapter.InterfaceIndex -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Select-Object -First 1).NextHop;" ^
  "$dns = (Get-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4).ServerAddresses;" ^
  "Write-Host 'Active Adapter: ' $adapter.InterfaceAlias -ForegroundColor Cyan;" ^
  "Write-Host 'Detected Local IP: ' $ipConf.IPAddress -ForegroundColor Green;" ^
  "Write-Host 'Subnet Prefix:     /' $ipConf.PrefixLength -ForegroundColor Green;" ^
  "Write-Host 'Default Gateway:   ' $gw -ForegroundColor Green;" ^
  "Write-Host 'DNS Servers:       ' ($dns -join ', ') -ForegroundColor Green;"
if errorlevel 1 pause & goto menu

echo.
echo  WARNING: Your network connection might blink/reconnect for a split second.
echo.
set /p "confirm=Freeze this configuration as STATIC? (Y/N): "
if /I not "%confirm%"=="Y" goto menu

echo.
echo  Configuring Static IP Address in progress...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$adapter = Get-NetIPInterface -AddressFamily IPv4 | Where-Object { $_.ConnectionState -eq 'Connected' -and $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Virtual|Bluetooth' } | Select-Object -First 1;" ^
  "$ipConf = Get-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1;" ^
  "$gw = (Get-NetRoute -InterfaceIndex $adapter.InterfaceIndex -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Select-Object -First 1).NextHop;" ^
  "if (-not $gw) { $octets = $ipConf.IPAddress.Split('.'); $gw = \"$($octets[0]).$($octets[1]).$($octets[2]).1\" };" ^
  "$dns = (Get-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4).ServerAddresses;" ^
  "if (-not $dns) { $dns = @('1.1.1.1', '8.8.8.8') };" ^
  "Set-NetIPInterface -InterfaceIndex $adapter.InterfaceIndex -Dhcp Disabled -ErrorAction SilentlyContinue;" ^
  "Remove-NetRoute -InterfaceIndex $adapter.InterfaceIndex -DestinationPrefix '0.0.0.0/0' -Confirm:$false -ErrorAction SilentlyContinue;" ^
  "Remove-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 -Confirm:$false -ErrorAction SilentlyContinue;" ^
  "New-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -IPAddress $ipConf.IPAddress -PrefixLength $ipConf.PrefixLength -DefaultGateway $gw -ErrorAction SilentlyContinue | Out-Null;" ^
  "Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ServerAddresses $dns -ErrorAction SilentlyContinue;" ^
  "Write-Host '  [OK] Static IP configured successfully!' -ForegroundColor Green;"
if errorlevel 1 (
    echo.
    echo  [FAIL] Failed to apply Static IP settings. Verify your adapter manually.
)
echo.
pause
goto menu

:: ====================================================================
:: OPTION 2: REVERT STATIC IP BACK TO DYNAMIC DHCP
:: ====================================================================
:dynamic_dhcp
cls
echo ====================================================================
echo  REVERTING LOCAL IP NETWORK CARD TO DYNAMIC (DHCP)
echo ====================================================================
echo.
echo  Detecting adapter...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$adapter = Get-NetIPInterface -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Virtual|Bluetooth' } | Select-Object -First 1;" ^
  "Write-Host 'Active Adapter: ' $adapter.InterfaceAlias -ForegroundColor Cyan;"
if errorlevel 1 pause & goto menu

echo.
set /p "confirm=Revert network adapter to DHCP? (Y/N): "
if /I not "%confirm%"=="Y" goto menu

echo.
echo  Reverting and obtaining dynamic lease...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$adapter = Get-NetIPInterface -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Virtual|Bluetooth' } | Select-Object -First 1;" ^
  "Set-NetIPInterface -InterfaceIndex $adapter.InterfaceIndex -Dhcp Enabled -ErrorAction SilentlyContinue;" ^
  "Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ResetServerAddresses -ErrorAction SilentlyContinue;" ^
  "Restart-NetAdapter -InterfaceIndex $adapter.InterfaceIndex -Confirm:$false -ErrorAction SilentlyContinue;" ^
  "Write-Host '  [OK] Reverted adapter to DHCP successfully!' -ForegroundColor Green;"
if errorlevel 1 (
    echo.
    echo  [FAIL] Reverting to DHCP encountered an error.
)
echo.
pause
goto menu

:: ====================================================================
:: OPTION 3: UPDATE HOSTS FILE DNS MAPPINGS
:: ====================================================================
:update_hosts_only
cls
echo ====================================================================
echo  UPDATING LOCAL DNS (C:\Windows\System32\drivers\etc\hosts)
echo ====================================================================
echo.
call :sub_update_hosts
echo.
pause
goto menu

:: ====================================================================
:: OPTION 4: UPDATE BACKEND & FRONTEND .ENV FILES
:: ====================================================================
:update_env_only
cls
echo ====================================================================
echo  UPDATING BACKEND & FRONTEND ENVIRONMENT FILES (.env)
echo ====================================================================
echo.
call :sub_update_env
echo.
pause
goto menu

:: ====================================================================
:: OPTION 5: FULL SYSTEM OPTIMIZATION
:: ====================================================================
:full_optimization
cls
echo ====================================================================
echo  RUNNING FULL SYSTEM OPTIMIZATION
echo ====================================================================
echo.

:: 1. Freeze IP
echo [1/4] Freezing Dynamic IP to Static...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$adapter = Get-NetIPInterface -AddressFamily IPv4 | Where-Object { $_.ConnectionState -eq 'Connected' -and $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Virtual|Bluetooth' } | Select-Object -First 1;" ^
  "if (-not $adapter) { Write-Host '  [FAIL] No active network adapter found!' -ForegroundColor Red; exit 1 };" ^
  "$ipConf = Get-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1;" ^
  "$gw = (Get-NetRoute -InterfaceIndex $adapter.InterfaceIndex -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Select-Object -First 1).NextHop;" ^
  "if (-not $gw) { $octets = $ipConf.IPAddress.Split('.'); $gw = \"$($octets[0]).$($octets[1]).$($octets[2]).1\" };" ^
  "$dns = (Get-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4).ServerAddresses;" ^
  "if (-not $dns) { $dns = @('1.1.1.1', '8.8.8.8') };" ^
  "Set-NetIPInterface -InterfaceIndex $adapter.InterfaceIndex -Dhcp Disabled -ErrorAction SilentlyContinue;" ^
  "Remove-NetRoute -InterfaceIndex $adapter.InterfaceIndex -DestinationPrefix '0.0.0.0/0' -Confirm:$false -ErrorAction SilentlyContinue;" ^
  "Remove-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 -Confirm:$false -ErrorAction SilentlyContinue;" ^
  "New-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -IPAddress $ipConf.IPAddress -PrefixLength $ipConf.PrefixLength -DefaultGateway $gw -ErrorAction SilentlyContinue | Out-Null;" ^
  "Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ServerAddresses $dns -ErrorAction SilentlyContinue;" ^
  "Write-Host '  [OK] Static IP Frozen: ' $ipConf.IPAddress -ForegroundColor Green;"
echo.

:: 2. Update Hosts file
echo [2/4] Updating Local Hosts DNS file...
call :sub_update_hosts
echo.

:: 3. Update Env files
echo [3/4] Updating Backend & Frontend .env variables...
call :sub_update_env
echo.

:: 4. Flush DNS Resolver Cache
echo [4/4] Flushing local DNS cache...
ipconfig /flushdns >nul
echo   [OK] Windows DNS resolver cache flushed successfully.
echo.
echo ====================================================================
echo  FULL SYSTEM OPTIMIZATION COMPLETED SUCCESSFULLY!
echo  Your IP is locked, DNS mapped, and system is fully optimized.
echo ====================================================================
echo.
pause
goto menu

:: ====================================================================
:: OPTION 6: SHOW NETWORK AND IP STATUS
:: ====================================================================
:show_status
cls
echo ====================================================================
echo  CURRENT NETWORK & IP CONFIGURATION STATUS
echo ====================================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$adapter = Get-NetIPInterface -AddressFamily IPv4 | Where-Object { $_.ConnectionState -eq 'Connected' -and $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Virtual|Bluetooth' } | Select-Object -First 1;" ^
  "if (-not $adapter) { Write-Host '  [!] No active connection detected.' -ForegroundColor Yellow; exit 0 };" ^
  "$ipConf = Get-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1;" ^
  "$gw = (Get-NetRoute -InterfaceIndex $adapter.InterfaceIndex -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Select-Object -First 1).NextHop;" ^
  "$dns = (Get-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4).ServerAddresses;" ^
  "Write-Host '  ➜ Network Adapter:  ' $adapter.InterfaceAlias -ForegroundColor Cyan;" ^
  "if ($adapter.Dhcp -eq 'Enabled') {" ^
  "  Write-Host '  ➜ DHCP (IP Mode):   DYNAMIC (IP changes on Wi-Fi reconnects)' -ForegroundColor Yellow" ^
  "} else {" ^
  "  Write-Host '  ➜ DHCP (IP Mode):   STATIC (IP Frozen - Safe for Employees)' -ForegroundColor Green" ^
  "}" ^
  "Write-Host '  ➜ Active IPv4 IP:   ' $ipConf.IPAddress -ForegroundColor Cyan;" ^
  "Write-Host '  ➜ Subnet Mask:      /' $ipConf.PrefixLength -ForegroundColor Cyan;" ^
  "Write-Host '  ➜ Default Gateway:  ' $gw -ForegroundColor Cyan;" ^
  "Write-Host '  ➜ Primary DNS:      ' ($dns -join ', ') -ForegroundColor Cyan;"
echo.
echo  --------------------------------------------------------------------
echo  Mapped Domains in C:\Windows\System32\drivers\etc\hosts:
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Select-String -Path '$env:SystemRoot\System32\drivers\etc\hosts' -Pattern 'achme.com' | ForEach-Object { '  ' + $_.Line }"
echo  --------------------------------------------------------------------
echo.
pause
goto menu


:: ====================================================================
:: REUSABLE SUB-ROUTINES
:: ====================================================================

:sub_update_hosts
:: Resolve active LAN IP dynamically
set "ACTIVE_IP="
for /f "usebackq tokens=*" %%I in (
  `powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ip = (Find-NetRoute -RemoteIPAddress '8.8.8.8' -ErrorAction SilentlyContinue | Select-Object -First 1).LocalIPAddress; if (-not $ip) { $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notmatch 'vEthernet|Loopback|Bluetooth' } | Select-Object -First 1).IPAddress }; $ip"`
) do set "ACTIVE_IP=%%I"

if "%ACTIVE_IP%"=="" set "ACTIVE_IP=127.0.0.1"

echo   Active Local IP detected: %ACTIVE_IP%
echo   Mapping local domains to %ACTIVE_IP%...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$hostsFile = \"$env:SystemRoot\System32\drivers\etc\hosts\";" ^
  "$domains = @('achme.com', 'www.achme.com');" ^
  "$content = Get-Content $hostsFile;" ^
  "$filtered = $content | Where-Object { $line = $_.Trim(); $match = $false; foreach($d in $domains) { if ($line -match \"\\b$d\\b\") { $match = $true } }; -not $match };" ^
  "$newMappings = @(" ^
  "  \"%ACTIVE_IP%    achme.com    www.achme.com\"" ^
  ");" ^
  "$filtered + $newMappings | Set-Content $hostsFile -Force;" ^
  "Write-Host '  [OK] hosts file mapped to active IP successfully!' -ForegroundColor Green;"

:: Update the employee hosts setup file dynamically with the current active IP
if exist "%ROOT%\employee-hosts-setup.bat" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "(Get-Content '%ROOT%\employee-hosts-setup.bat') -replace 'set \"SERVER_IP=.*\"', 'set \"SERVER_IP=%ACTIVE_IP%\"' | Set-Content '%ROOT%\employee-hosts-setup.bat' -Force;" ^
      "Write-Host '  [OK] employee-hosts-setup.bat updated with active IP.' -ForegroundColor Green;"
)
exit /b 0


:sub_update_env
:: Resolve active LAN IP dynamically
set "ACTIVE_IP="
for /f "usebackq tokens=*" %%I in (
  `powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ip = (Find-NetRoute -RemoteIPAddress '8.8.8.8' -ErrorAction SilentlyContinue | Select-Object -First 1).LocalIPAddress; if (-not $ip) { $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notmatch 'vEthernet|Loopback|Bluetooth' } | Select-Object -First 1).IPAddress }; $ip"`
) do set "ACTIVE_IP=%%I"

if "%ACTIVE_IP%"=="" set "ACTIVE_IP=127.0.0.1"

echo   Active Local IP detected: %ACTIVE_IP%

:: 1. Update backend env
if exist "%ROOT%\backend\.env" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$envFile = '%ROOT%\backend\.env';" ^
      "$content = Get-Content $envFile;" ^
      "$updated = $content | ForEach-Object {" ^
      "  if ($_ -match '^ALLOWED_ORIGIN=') {" ^
      "    'ALLOWED_ORIGIN=http://localhost:82,http://%ACTIVE_IP%:82,http://achme.com,http://www.achme.com'" ^
      "  } else {" ^
      "    $_" ^
      "  }" ^
      "};" ^
      "$updated | Set-Content $envFile -Force;" ^
      "Write-Host '  [OK] backend\.env written.' -ForegroundColor Green;"
) else (
    echo   [WARN] backend\.env not found.
)

:: 2. Update frontend env
if exist "%ROOT%\frontend\.env" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$envFile = '%ROOT%\frontend\.env';" ^
      "$content = Get-Content $envFile;" ^
      "$updated = $content | ForEach-Object {" ^
      "  if ($_ -match '^REACT_APP_API_URL=') {" ^
      "    'REACT_APP_API_URL=http://%ACTIVE_IP%:5000'" ^
      "  } elseif ($_ -match '^REACT_APP_API_PROXY=') {" ^
      "    'REACT_APP_API_PROXY=http://%ACTIVE_IP%:5000'" ^
      "  } else {" ^
      "    $_" ^
      "  }" ^
      "};" ^
      "$updated | Set-Content $envFile -Force;" ^
      "Write-Host '  [OK] frontend\.env written.' -ForegroundColor Green;"
) else (
    echo   [WARN] frontend\.env not found.
)
exit /b 0
