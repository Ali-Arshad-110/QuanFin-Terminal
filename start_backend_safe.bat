@echo off
REM QuanFin Terminal Backend Startup Script
REM This script starts the FastAPI backend with proper environment setup

cd /d "%~dp0backend"

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ===============================================
    echo ERROR: Python is not available in PATH
    echo ===============================================
    echo.
    echo Solution: Please install Python 3.8+ or add Python to PATH
    echo Download from: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM Run the server using the custom run_server.py script
echo.
echo ===============================================
echo Starting QuanFin Terminal Backend...
echo ===============================================
echo.
python run_server.py

REM Keep window open if there's an error
if %errorlevel% neq 0 (
    echo.
    echo Backend failed to start. See error above.
    pause
)
