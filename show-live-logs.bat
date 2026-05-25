@echo off
setlocal
title ACHME CRM - Open Live Logs

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
if not exist "%LOG_DIR%\pm2-out.log" type nul > "%LOG_DIR%\pm2-out.log"
if not exist "%LOG_DIR%\pm2-error.log" type nul > "%LOG_DIR%\pm2-error.log"
if not exist "%NGINX_DIR%\logs" mkdir "%NGINX_DIR%\logs"
if not exist "%NGINX_DIR%\logs\achme_error.log" type nul > "%NGINX_DIR%\logs\achme_error.log"

start "ACHME Backend Logs" cmd /k "cd /d ""%ROOT%"" && pm2 logs achme-backend --lines 100"
start "ACHME PM2 Error Log" powershell -NoExit -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%LOG_DIR%\pm2-error.log' -Tail 50 -Wait"
start "ACHME Nginx Error Log" powershell -NoExit -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%NGINX_DIR%\logs\achme_error.log' -Tail 50 -Wait"

echo Live log windows opened.
exit /b 0
