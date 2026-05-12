@echo off
setlocal

:: Get the directory where the script is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo Installing dependencies (if possible)...
set "VENV_PY=%SCRIPT_DIR%Lib\Scripts\python.exe"
if exist "%VENV_PY%" (
    echo Using local virtual environment Python: %VENV_PY%
) else (
    echo WARNING: Local virtual environment Python not found at %VENV_PY%. Falling back to py command.
    set "VENV_PY=py"
)
"%VENV_PY%" -m pip install -r backend/requirements.txt || echo WARNING: Dependency install failed, attempting to start anyway...

echo.
echo Starting QuanFin Backend...
echo --------------------------------
echo Project Root: %SCRIPT_DIR%
echo Backend Dir: %SCRIPT_DIR%backend
echo Lib Dir: %SCRIPT_DIR%Lib\Lib\site-packages
echo --------------------------------

:: Set PYTHONPATH to include the local Lib/site-packages
set "PYTHONPATH=%SCRIPT_DIR%Lib\Lib\site-packages"

:: Navigate to backend
cd backend

:: Run Uvicorn
"%VENV_PY%" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Backend failed to start.
    echo Please check the error message above.
    pause
    exit /b %ERRORLEVEL%
)

pause
