@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   ACHME CRM Docker Orchestrator Launcher
echo ===================================================
echo.

:: ── Check Docker Installation ────────────────────────────────────────────────
echo [i] Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [X] Error: Docker is not installed or not running.
    echo     Please install Docker Desktop and ensure the service is running.
    pause
    exit /b 1
)
echo [OK] Docker is installed and running.

:: ── Check Docker Compose command compatibility ──────────────────────────────
echo [i] Checking Docker Compose support...
docker-compose --version >nul 2>&1
if %errorlevel% equ 0 (
    set DOCKER_COMPOSE_CMD=docker-compose
) else (
    docker compose version >nul 2>&1
    if %errorlevel% equ 0 (
        set DOCKER_COMPOSE_CMD=docker compose
    ) else (
        echo [X] Error: Neither "docker-compose" nor "docker compose" was found in PATH.
        echo     Please ensure Docker Desktop is updated and added to your environment variables.
        pause
        exit /b 1
    )
)
echo [OK] Using compose command: %DOCKER_COMPOSE_CMD%
echo.

:: ── Environment Configuration Setup ──────────────────────────────────────────
echo [i] Checking environment variables configuration...
if not exist .env (
    if exist .env.example (
        echo [*] .env file not found in root. Auto-generating from .env.example...
        copy .env.example .env >nul
        if errorlevel 1 (
            echo [X] Error: Failed to generate .env file from .env.example.
            pause
            exit /b 1
        )
        echo [OK] Generated root .env file successfully.
    ) else (
        echo [WARN] .env.example template not found. Creating a default .env file...
        (
            echo NODE_ENV=production
            echo PORT=5000
            echo ALLOWED_ORIGIN=http://localhost:3000
            echo DEFAULT_TEST_PASSWORD=Test@12345
            echo DB_HOST=mysql
            echo DB_PORT=3306
            echo DB_USER=root
            echo DB_NAME=achme
            echo MYSQL_ROOT_PASSWORD=admin@123
            echo JWT_SECRET=97418d0c15d57ade768586b8501e35d34e5a5277f2a0570b6d5b47ef93f5b33e88b80045c60efd77e6edcbb015dbe46cf6747ce1dd8f11361f3e426ddc677c9a
            echo SMTP_HOST=smtp.gmail.com
            echo SMTP_PORT=587
            echo EMAIL_USER=thanan757@gmail.com
            echo EMAIL_PASS=ghjv omqm hwji kerq
            echo REACT_APP_API_URL=http://localhost:5000
        ) > .env
        echo [OK] Default .env created.
    )
) else (
    echo [OK] Active .env configuration found.
)
echo.

:: ── Tear Down Active Containers ──────────────────────────────────────────────
echo [...] Cleaning up previous container resources...
%DOCKER_COMPOSE_CMD% down --remove-orphans >nul 2>&1
echo [OK] Active resources cleaned up.
echo.

:: ── Build Images ─────────────────────────────────────────────────────────────
echo [...] Building CRM Docker images (this may take a few minutes)...
%DOCKER_COMPOSE_CMD% build
if errorlevel 1 (
    echo [X] Error: Docker build failed. Inspect the logs above to identify the issue.
    pause
    exit /b 1
)
echo [OK] Built all Docker images successfully.
echo.

:: ── Launch Services ─────────────────────────────────────────────────────────
echo [...] Starting CRM services in detached mode...
%DOCKER_COMPOSE_CMD% up -d
if errorlevel 1 (
    echo [X] Error: Failed to start CRM containers.
    pause
    exit /b 1
)
echo [OK] Containers started!
echo.

:: ── Polling Health checks ────────────────────────────────────────────────────
set /a retry_count=0
echo [...] Waiting for MySQL Database server to initialize and report healthy...
:wait_loop
if %retry_count% geq 15 (
    echo [WARN] MySQL is taking longer than expected to report healthy.
    echo        Proceeding anyway. Services should be up momentarily.
    goto services_ready
)
timeout /t 2 >nul
docker inspect --format="{{.State.Health.Status}}" achme-mysql 2>nul | findstr "healthy" >nul
if %errorlevel% neq 0 (
    set /a retry_count+=1
    goto wait_loop
)

:services_ready
echo [OK] MySQL is healthy and fully running.
echo.

:: ── Output Success Panel ─────────────────────────────────────────────────────
echo ===================================================
echo   [OK] ACHME CRM Services Successfully Launched!
echo ===================================================
echo   * Frontend Web Portal: http://localhost:3000
echo   * Backend REST API:    http://localhost:5000
echo   * Backend Health:      http://localhost:5000/api/health
echo   * MySQL Database:      localhost:3306 (External)
echo ===================================================
echo.
echo Useful Commands:
echo   - View real-time logs:  %DOCKER_COMPOSE_CMD% logs -f
echo   - View specific logs:   %DOCKER_COMPOSE_CMD% logs -f backend
echo   - Shutdown services:    %DOCKER_COMPOSE_CMD% down
echo.

pause