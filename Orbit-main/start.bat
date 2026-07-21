@echo off
setlocal enabledelayedexpansion
title Orbit Main Launcher

echo ============================================
echo   Orbit Main - Install and Launch
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

echo ---- Freeing ports 5000 (server) and 3000 (client) if already in use ----
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000,3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { try { Stop-Process -Id $_ -Force -ErrorAction Stop; Write-Host ('Killed stale process on port: ' + $_) } catch {} }"

echo.
echo ---- Installing dependencies ----
call npm install
if errorlevel 1 goto :install_failed

echo.
echo ---- Launching Orbit Main ----
start "Orbit Main - Dev Server" cmd /k "npm run dev"

echo.
echo Waiting for backend server to start...
:wait_server
powershell -NoProfile -Command "if (Test-NetConnection -ComputerName localhost -Port 5000 -InformationLevel Quiet) { exit 0 } else { exit 1 }" >nul 2>nul
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto :wait_server
)

echo.
echo Opening the app in your browser...
start "" "http://localhost:3000"

goto :eof

:no_node
echo [ERROR] Node.js is not installed or not in PATH.
pause
exit /b 1

:no_npm
echo [ERROR] npm is not installed or not in PATH.
pause
exit /b 1

:install_failed
echo [ERROR] npm install failed.
pause
exit /b 1
