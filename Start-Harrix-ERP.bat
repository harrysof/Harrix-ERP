@echo off
title Harrix ERP - Launcher
setlocal

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%apps\dashboard"

echo ============================================
echo   Harrix ERP - Starting
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed, or not on PATH.
    echo Install it from https://nodejs.org then run this file again.
    echo.
    pause
    exit /b 1
)

if not exist "%BACKEND%\node_modules" (
    echo First-time setup: installing backend dependencies, this can take a minute...
    call npm install --prefix "%BACKEND%"
    if errorlevel 1 goto :error
)

if not exist "%FRONTEND%\node_modules" (
    echo First-time setup: installing app dependencies, this can take a minute...
    call npm install --prefix "%FRONTEND%"
    if errorlevel 1 goto :error
)

if not exist "%BACKEND%\generated\prisma" (
    echo First-time setup: generating the database client...
    call npm run prisma:generate --prefix "%BACKEND%"
    if errorlevel 1 goto :error
)

if not exist "%BACKEND%\dev.db" (
    echo First-time setup: creating the database and loading demo data...
    call npm run prisma:deploy --prefix "%BACKEND%"
    if errorlevel 1 goto :error
    call npm run prisma:seed --prefix "%BACKEND%"
    if errorlevel 1 goto :error
)

echo.
echo Starting the server...
start "Harrix ERP - Server" cmd /k "cd /d "%BACKEND%" && npm run start:dev"

timeout /t 3 /nobreak >nul

echo Starting the app...
start "Harrix ERP - App" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo.
echo Opening the browser in a few seconds...
timeout /t 6 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo ============================================
echo   Harrix ERP is running.
echo   Keep the two new windows open ("Server" and "App").
echo   To stop everything, close those two windows (or press Ctrl+C in each).
echo ============================================
echo.
pause
exit /b 0

:error
echo.
echo ============================================
echo   Something went wrong during setup - see the messages above.
echo ============================================
echo.
pause
exit /b 1
