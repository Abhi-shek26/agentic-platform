@echo off
REM Agentic Platform - Quick Start Deployment Script (Windows)
REM Usage: deploy.bat [option]
REM Options: local, docker, azure, test

setlocal enabledelayedexpansion

echo.
echo ================================================
echo   Agentic Tournament Generator - Deployment
echo ================================================
echo.

if "%1%"=="" (
    echo Choose deployment method:
    echo.
    echo   1. local   - Run locally (quickest, no Docker^)
    echo   2. docker  - Run in Docker (isolated, recommended^)
    echo   3. azure   - Deploy to Azure (production^)
    echo   4. test    - Run E2E tests
    echo.
    set /p choice="Enter choice (1-4) or method name: "
) else (
    set choice=%1%
)

if "!choice!"=="1" goto local
if "!choice!"=="local" goto local
if "!choice!"=="2" goto docker
if "!choice!"=="docker" goto docker
if "!choice!"=="3" goto azure
if "!choice!"=="azure" goto azure
if "!choice!"=="4" goto test
if "!choice!"=="test" goto test

echo Invalid choice
exit /b 1

:local
echo.
echo ================================================
echo   LOCAL DEPLOYMENT (No Docker^)
echo ================================================
echo.

echo Checking prerequisites...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js not found. Please install Node.js 20+
    exit /b 1
)
echo OK Node.js installed

where redis-cli >nul 2>nul
if %errorlevel% neq 0 (
    echo Warning: Redis not found locally. Starting with Docker...
    docker run -d -p 6379:6379 --name agentic-redis redis:7
    timeout /t 2
)
echo OK Redis available

echo.
echo Installing dependencies...
call npm ci

echo.
echo Creating .env file...
if not exist .env (
    (
        echo NODE_ENV=production
        echo PORT=5000
        echo MOCK_AGENTS=true
        echo DATABASE_URL=postgresql://admin:secure_password_change_me@localhost:5432/agentic_platform
        echo REDIS_URL=redis://localhost:6379
    ) > .env
    echo Created .env file
)

echo.
echo Starting application...
call npm start
goto end

:docker
echo.
echo ================================================
echo   DOCKER DEPLOYMENT
echo ================================================
echo.

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Docker not found. Please install Docker.
    exit /b 1
)

echo Building Docker image...
docker build -f docker/Dockerfile -t agentic-platform:latest .

echo.
echo Starting services with docker-compose...
docker-compose up -d

echo.
echo Waiting for services to be ready...
setlocal enabledelayedexpansion
for /L %%i in (1,1,30) do (
    curl -s http://localhost:5000/api/health >nul 2>nul
    if !errorlevel! equ 0 (
        echo Application is ready!
        goto docker_ready
    )
    echo.
    timeout /t 2 /nobreak
)

:docker_ready
echo.
echo Deployment complete!
echo.
echo Access the application at: http://localhost:5000
echo.
echo To view logs: docker-compose logs -f
echo To stop: docker-compose down
echo.
goto end

:azure
echo.
echo ================================================
echo   AZURE DEPLOYMENT
echo ================================================
echo.

where az >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Azure CLI not found. Please install Azure CLI.
    echo Visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
    exit /b 1
)

echo Logging into Azure...
call az login

echo Creating Azure resources...
set RESOURCE_GROUP=agentic-platform-rg
set LOCATION=eastus
set ACR_NAME=agenticplatformacr
set CONTAINER_NAME=agentic-platform

call az group create --name !RESOURCE_GROUP! --location !LOCATION!
call az acr create --resource-group !RESOURCE_GROUP! --name !ACR_NAME! --sku Basic

echo Building and pushing Docker image...
call az acr build --registry !ACR_NAME! --image agentic-platform:latest --file docker/Dockerfile .

echo Creating PostgreSQL database...
call az postgres flexible-server create --resource-group !RESOURCE_GROUP! --name agentic-postgres --admin-user admin --admin-password "SecurePassword123!" --database-name agentic_platform

echo Creating Redis cache...
call az redis create --resource-group !RESOURCE_GROUP! --name agentic-redis --location !LOCATION! --sku basic --vm-size c0

echo.
echo Deployment complete! Application is being deployed to Azure.
echo.
goto end

:test
echo.
echo ================================================
echo   RUNNING TESTS
echo ================================================
echo.

echo Running E2E tests...
call npm run test:e2e

echo.
echo Tests completed!
echo.
goto end

:end
endlocal
