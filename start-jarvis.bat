@echo off
title JARVIS AI Assistant - Core Controller
color 0B
cls

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║         JARVIS AI Assistant              ║
echo  ║      Booting Next-Gen OS Engine...       ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found! Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found! Please install Python 3.14+
    pause
    exit /b 1
)

:: Verify Virtual Environment exists
if not exist "venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
)

:: Install Python backend dependencies
echo [INFO] Syncing Python dependencies...
.\venv\Scripts\pip install -r backend\requirements.txt

:: Install frontend dependencies
if not exist "frontend\node_modules" (
    echo [INFO] Installing Node modules for holographic interface...
    cd frontend && npm install && cd ..
)

echo.
echo [INFO] Booting FastAPI intelligence cores...
start "JARVIS Backend Core" /min cmd /c ".\venv\Scripts\python backend\main.py"

echo [INFO] Waiting for service handshake...
timeout /t 3 >nul

echo [INFO] Booting Holographic Electron HUD...
cd frontend
npm run electron:dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] JARVIS HUD collapsed. Check system logs.
    pause
)
