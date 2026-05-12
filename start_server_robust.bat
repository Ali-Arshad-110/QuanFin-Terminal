@echo off
setlocal
title QuanFin Backend Server

echo ==========================================
echo   QuanFin Capital Terminal - Backend
echo ==========================================
echo.

cd /d "%~dp0backend"

:: 1. Check for Python
echo [1/3] Checking Python installation...

:: method 1: python command
python --version >nul 2>&1
if not errorlevel 1 (
    set PYTHON_CMD=python
    goto :FOUND_PYTHON
)

:: method 2: py command
py --version >nul 2>&1
if not errorlevel 1 (
    set PYTHON_CMD=py
    goto :FOUND_PYTHON
)

echo ERROR: Python is not installed or not in PATH.
echo Please install Python from https://python.org/downloads
pause
exit /b 1

:FOUND_PYTHON
echo Using: %PYTHON_CMD%
echo.

:: 2. Install Dependencies
echo [2/3] Installing/Verifying Dependencies...
%PYTHON_CMD% -m pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo WARNING: Pip install failed. Attempting to continue anyway...
) else (
    echo Dependencies OK.
)
echo.

:: 3. Start Server
echo [3/3] Starting Uvicorn Server on Port 8000...
echo.
echo    Setting PYTHONPATH to include local libraries...
set "PYTHONPATH=%~dp0Lib\site-packages;%PYTHONPATH%"
echo.
echo    Waiting for application startup...
echo.

%PYTHON_CMD% -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

if errorlevel 1 (
    echo.
    echo ERROR: Server failed to start.
    echo Possible causes:
    echo  - 'uvicorn' is not installed (check step 2)
    echo  - Port 8000 is already in use
    pause
)
