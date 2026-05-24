@echo off
cd /d "%~dp0"
echo ========================================
echo  ACHME Backend - Running All Tests
echo ========================================
echo.
call npx jest --setupFilesAfterEnv=./tests/setup.js --runInBand --detectOpenHandles --forceExit --verbose
echo.
echo ========================================
echo  ALL TESTS COMPLETED
echo ========================================
pause
