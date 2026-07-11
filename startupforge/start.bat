@echo off
setlocal enabledelayedexpansion
title StartupForge Launcher

echo ============================================
echo   StartupForge - Install and Launch
echo ============================================
echo.

set "ROOT=%~dp0"
cd /d "%ROOT%"

REM ---- Check Node.js ----
where node >nul 2>nul
if errorlevel 1 goto :no_node

REM ---- Check npm ----
where npm >nul 2>nul
if errorlevel 1 goto :no_npm

REM ---- Check Ollama ----
set "HAS_OLLAMA=0"
where ollama >nul 2>nul
if not errorlevel 1 set "HAS_OLLAMA=1"

if "%HAS_OLLAMA%"=="1" (
  echo [OK] Ollama found.
) else (
  echo [WARN] Ollama not found in PATH. Install from https://ollama.com
  echo        The backend needs it running for the Gemma context step.
)

REM ---- Check server/.env exists ----
if not exist "%ROOT%server\.env" (
  echo [INFO] server\.env not found, creating from .env.example ...
  copy "%ROOT%server\.env.example" "%ROOT%server\.env" >nul
  echo [ACTION REQUIRED] Edit server\.env and add your GOOGLE_API_KEY before building MVPs.
)

echo.
echo ---- Installing server dependencies ----
cd /d "%ROOT%server"
call npm install
if errorlevel 1 goto :install_failed_server

echo.
echo ---- Installing client dependencies ----
cd /d "%ROOT%client"
call npm install
if errorlevel 1 goto :install_failed_client

cd /d "%ROOT%"

REM ---- Determine Gemma model from server\.env (fallback to default) ----
set "GEMMA_MODEL=gemma4:e2b"
for /f "tokens=2 delims==" %%B in ('findstr /b /i "GEMMA_MODEL=" "%ROOT%server\.env"') do set "GEMMA_MODEL=%%B"

echo.
echo ---- Checking Ollama model ----
if "%HAS_OLLAMA%"=="1" (
  echo Using model: %GEMMA_MODEL%
  echo Pulling model if not already present, this may take a while...
  call ollama pull %GEMMA_MODEL%
) else (
  echo Skipping Ollama model pull - Ollama not installed.
)

echo.
echo ---- Launching services ----

REM Start Ollama in its own window (harmless if already running)
if "%HAS_OLLAMA%"=="1" (
  start "Ollama - Gemma" cmd /k "ollama run %GEMMA_MODEL%"
)

REM Start backend server
start "StartupForge - Server" cmd /k "cd /d "%ROOT%server" && npm run dev"

REM Give the server a moment to boot before the client proxies to it
timeout /t 3 /nobreak >nul

REM Start frontend client
start "StartupForge - Client" cmd /k "cd /d "%ROOT%client" && npm run dev"

echo.
echo ============================================
echo   All services launching in separate windows:
echo     - Ollama (Gemma model)
echo     - Backend server  -^> http://localhost:3001
echo     - Frontend client -^> http://localhost:5173
echo ============================================
echo.
echo Opening the app in your browser...
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

goto :eof

:no_node
echo [ERROR] Node.js is not installed or not in PATH.
echo Install it from https://nodejs.org and re-run this script.
pause
exit /b 1

:no_npm
echo [ERROR] npm is not installed or not in PATH.
pause
exit /b 1

:install_failed_server
echo [ERROR] Server npm install failed. See output above.
pause
exit /b 1

:install_failed_client
echo [ERROR] Client npm install failed. See output above.
pause
exit /b 1
