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

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [%DATE% %TIME%] Startup restore running from %ROOT%>> "%LOG_DIR%\startup-restore.log"

cd /d "%ROOT%"

:: Enforce PM2_HOME to load the user's process list under SYSTEM or startup context
if not defined PM2_HOME (
  if exist "C:\Users\thana\.pm2" (
    set "PM2_HOME=C:\Users\thana\.pm2"
  ) else if exist "%USERPROFILE%\.pm2" (
    set "PM2_HOME=%USERPROFILE%\.pm2"
  )
)

:: Find the exact PM2 binary executable path under different accounts
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

echo [%DATE% %TIME%] Resolved PM2 executable: %PM2_EXEC% with PM2_HOME: %PM2_HOME%>> "%LOG_DIR%\startup-restore.log"

:: Resurrect or start servers securely
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
    echo PM2 not found. Run start-live.bat once to install and configure PM2.>> "%LOG_DIR%\startup-restore.log"
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "if (-not (Get-NetTCPConnection -State Listen -LocalPort 82 -ErrorAction SilentlyContinue)) { if (Test-Path '%NGINX_DIR%\nginx.exe') { Start-Process -FilePath '%NGINX_DIR%\nginx.exe' -WorkingDirectory '%NGINX_DIR%' -WindowStyle Hidden } } else { if (Test-Path '%NGINX_DIR%\nginx.exe') { Start-Process -FilePath '%NGINX_DIR%\nginx.exe' -ArgumentList '-s','reload' -WorkingDirectory '%NGINX_DIR%' -WindowStyle Hidden } }" >> "%LOG_DIR%\startup-restore.log" 2>&1

exit /b 0
