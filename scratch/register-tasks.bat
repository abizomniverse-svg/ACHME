@echo off
:: Auto-elevate
net session >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b 0
)

set "ROOT=d:\ACHME_COMUNICATION-main"

echo Registering ACHME_CRM_AutoBoot (SYSTEM - power-on)...
schtasks /create /tn "ACHME_CRM_AutoBoot" /tr "%ROOT%\achme-startup.bat" /sc onstart /delay 0000:10 /ru SYSTEM /f
if not errorlevel 1 (echo   [OK] SYSTEM boot task registered.) else (echo   [FAIL])

echo Registering ACHME_CRM_Login_Startup (User login fallback)...
schtasks /create /tn "ACHME_CRM_Login_Startup" /tr "%ROOT%\achme-startup.bat" /sc onlogon /rl HIGHEST /f
if not errorlevel 1 (echo   [OK] Login fallback task registered.) else (echo   [FAIL])

echo Registering ACHME_CRM_Boot_Startup (Legacy - cleanup)...
schtasks /delete /tn "ACHME_CRM_Boot_Startup" /f >nul 2>&1

echo.
echo Verifying...
schtasks /query /tn "ACHME_CRM_AutoBoot" /fo LIST 2>nul
schtasks /query /tn "ACHME_CRM_Login_Startup" /fo LIST 2>nul

echo.
echo Done! Press any key to close.
pause >nul
