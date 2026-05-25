@echo off
setlocal
title ACHME CRM - Startup Restore

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "NGINX_DIR=C:\nginx"
set "LOG_DIR=%ROOT%\logs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [%DATE% %TIME%] Startup restore running from %ROOT%>> "%LOG_DIR%\startup-restore.log"

cd /d "%ROOT%"

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

powershell -NoProfile -ExecutionPolicy Bypass -Command "if (-not (Get-NetTCPConnection -State Listen -LocalPort 82 -ErrorAction SilentlyContinue)) { if (Test-Path 'C:\nginx\nginx.exe') { Start-Process -FilePath 'C:\nginx\nginx.exe' -WorkingDirectory 'C:\nginx' -WindowStyle Hidden } } else { if (Test-Path 'C:\nginx\nginx.exe') { Start-Process -FilePath 'C:\nginx\nginx.exe' -ArgumentList '-s','reload' -WorkingDirectory 'C:\nginx' -WindowStyle Hidden } }" >> "%LOG_DIR%\startup-restore.log" 2>&1

exit /b 0
