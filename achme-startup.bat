@echo off
setlocal
title ACHME CRM - Startup Restore

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "NGINX_DIR=C:\nginx"
if not exist "%NGINX_DIR%\nginx.exe" (
  if exist "%ROOT%\nginx\nginx.exe" (
    set "NGINX_DIR=%ROOT%\nginx"
  )
)
set "LOG_DIR=%ROOT%\logs"
set "BACKEND_PORT=5000"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [%DATE% %TIME%] Startup restore running from %ROOT% >> "%LOG_DIR%\startup-restore.log"

cd /d "%ROOT%"

:: ---------------------------------------------------------------
:: Detect current LAN IP so localhost:82 AND IP:82 both work
:: ---------------------------------------------------------------
set "LAN_IP=127.0.0.1"
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notmatch 'vEthernet|Loopback|Bluetooth' } | Select-Object -First 1).IPAddress"`) do set "LAN_IP=%%i"
echo [%DATE% %TIME%] Detected LAN IP: %LAN_IP% >> "%LOG_DIR%\startup-restore.log"

:: ---------------------------------------------------------------
:: Rewrite nginx.conf with current LAN IP (localhost + LAN)
:: ---------------------------------------------------------------
if exist "%NGINX_DIR%\nginx.exe" (
  if not exist "%NGINX_DIR%\html\achme" mkdir "%NGINX_DIR%\html\achme"
  (
  echo worker_processes 1;
  echo.
  echo events {
  echo     worker_connections 1024;
  echo }
  echo.
  echo http {
  echo     include       mime.types;
  echo     default_type  application/octet-stream;
  echo     sendfile        on;
  echo     keepalive_timeout 65;
  echo     access_log  logs/achme_access.log;
  echo     error_log   logs/achme_error.log;
  echo.
  echo     upstream achme_backend {
  echo         server 127.0.0.1:%BACKEND_PORT%;
  echo         keepalive 32;
  echo     }
  echo.
  echo     server {
  echo         listen 82;
  echo         server_name achme.com www.achme.com IBM-SERVER IBM-SERVER.achme.com %LAN_IP% 127.0.0.1 localhost _;
  echo.
  echo         root %NGINX_DIR%/html/achme;
  echo         index index.html;
  echo.
  echo         location / {
  echo             try_files $uri $uri/ /index.html;
  echo         }
  echo.
  echo         location = /index.html {
  echo             add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
  echo             expires -1;
  echo         }
  echo.
  echo         location /api/ {
  echo             proxy_pass http://achme_backend/api/;
  echo             proxy_http_version 1.1;
  echo             proxy_set_header Host              $host;
  echo             proxy_set_header X-Real-IP         $remote_addr;
  echo             proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
  echo             proxy_set_header X-Forwarded-Proto $scheme;
  echo             proxy_connect_timeout  120s;
  echo             proxy_send_timeout     120s;
  echo             proxy_read_timeout     120s;
  echo             client_max_body_size   50M;
  echo         }
  echo.
  echo         location /socket.io/ {
  echo             proxy_pass http://achme_backend/socket.io/;
  echo             proxy_http_version 1.1;
  echo             proxy_set_header Upgrade    $http_upgrade;
  echo             proxy_set_header Connection "upgrade";
  echo             proxy_set_header Host              $host;
  echo             proxy_set_header X-Real-IP         $remote_addr;
  echo             proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
  echo             proxy_connect_timeout  60s;
  echo             proxy_send_timeout     60s;
  echo             proxy_read_timeout     3600s;
  echo         }
  echo.
  echo         location /nginx-health {
  echo             return 200 "Nginx OK - ACHME CRM\n";
  echo             add_header Content-Type text/plain;
  echo         }
  echo.
  echo         location ~* \.(js^|css^|png^|jpg^|jpeg^|gif^|ico^|svg^|woff^|woff2^|ttf^|eot^)$ {
  echo             expires 1y;
  echo             add_header Cache-Control "public, immutable";
  echo             access_log off;
  echo         }
  echo.
  echo         location ~ /\. {
  echo             deny all;
  echo         }
  echo     }
  echo }
  ) > "%NGINX_DIR%\conf\nginx.conf"
  echo [%DATE% %TIME%] nginx.conf written with LAN IP %LAN_IP% >> "%LOG_DIR%\startup-restore.log"
)

:: ---------------------------------------------------------------
:: Enforce PM2_HOME to load the user's process list
:: ---------------------------------------------------------------
if not defined PM2_HOME (
  if exist "C:\Users\thana\.pm2" (
    set "PM2_HOME=C:\Users\thana\.pm2"
  ) else if exist "%USERPROFILE%\.pm2" (
    set "PM2_HOME=%USERPROFILE%\.pm2"
  )
)

:: Find PM2 binary
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

echo [%DATE% %TIME%] PM2: %PM2_EXEC% (HOME: %PM2_HOME%) >> "%LOG_DIR%\startup-restore.log"

:: Start PM2 backend
if exist "%PM2_EXEC%" (
  call "%PM2_EXEC%" resurrect >> "%LOG_DIR%\startup-restore.log" 2>&1
  call "%PM2_EXEC%" describe achme-backend >nul 2>&1
  if errorlevel 1 if exist "%ROOT%\backend\ecosystem.production.config.js" (
    cd /d "%ROOT%\backend"
    call "%PM2_EXEC%" start ecosystem.production.config.js >> "%LOG_DIR%\startup-restore.log" 2>&1
    cd /d "%ROOT%"
  )
) else (
  where pm2 >nul 2>&1
  if not errorlevel 1 (
    pm2 resurrect >> "%LOG_DIR%\startup-restore.log" 2>&1
    pm2 describe achme-backend >nul 2>&1
    if errorlevel 1 if exist "%ROOT%\backend\ecosystem.production.config.js" (
      cd /d "%ROOT%\backend"
      pm2 start ecosystem.production.config.js >> "%LOG_DIR%\startup-restore.log" 2>&1
      cd /d "%ROOT%"
    )
  ) else (
    echo PM2 not found. Run start-servers.bat once to configure PM2. >> "%LOG_DIR%\startup-restore.log"
  )
)

:: ---------------------------------------------------------------
:: Start or reload Nginx (handles both localhost:82 and IP:82)
:: ---------------------------------------------------------------
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$nginx = '%NGINX_DIR%\nginx.exe';" ^
  "if (-not (Test-Path $nginx)) { Write-Host 'Nginx not found at %NGINX_DIR%'; exit }" ^
  "if (Get-NetTCPConnection -State Listen -LocalPort 82 -ErrorAction SilentlyContinue) {" ^
  "  Start-Process -FilePath $nginx -ArgumentList '-s','reload' -WorkingDirectory '%NGINX_DIR%' -WindowStyle Hidden" ^
  "  Add-Content '%LOG_DIR%\startup-restore.log' '[Nginx] Reloaded on port 82'" ^
  "} else {" ^
  "  Start-Process -FilePath $nginx -WorkingDirectory '%NGINX_DIR%' -WindowStyle Hidden" ^
  "  Add-Content '%LOG_DIR%\startup-restore.log' '[Nginx] Started on port 82'" ^
  "}" >> "%LOG_DIR%\startup-restore.log" 2>&1

exit /b 0
