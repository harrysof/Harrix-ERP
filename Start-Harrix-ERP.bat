@echo off
title Harrix ERP - Launcher
rem Delayed expansion is required: %VAR% inside a parenthesised block is
rem substituted when the block is PARSED, not when it runs, so a variable set
rem inside the block still reads as empty later in that same block. The
rem first-time JWT secret below is set and then checked inside one such block.
setlocal EnableDelayedExpansion

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

if not exist "%BACKEND%\.env" (
    echo First-time setup: creating backend\.env from the example...
    copy "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
    if errorlevel 1 goto :error

    echo First-time setup: generating a random JWT secret...
    for /f "delims=" %%S in ('node -e "console.log(require(\"crypto\").randomBytes(48).toString(\"base64url\"))"') do set "JWTSECRET=%%S"
    if "!JWTSECRET!"=="" goto :error

    powershell -NoProfile -Command "(Get-Content -Raw '%BACKEND%\.env') -replace 'changez-moi-par-une-longue-chaine-aleatoire', '!JWTSECRET!' | Set-Content -NoNewline -Encoding utf8 '%BACKEND%\.env'"
    if errorlevel 1 goto :error

    rem Refuse to start on the placeholder secret: it is published in the
    rem committed .env.example, so anyone holding a copy of the source could
    rem sign a token for any account.
    findstr /c:"changez-moi-par-une-longue-chaine-aleatoire" "%BACKEND%\.env" >nul 2>nul
    if not errorlevel 1 (
        echo [ERROR] The JWT secret was not replaced. Refusing to start with the default.
        goto :error
    )
)

if not exist "%BACKEND%\node_modules" (
    echo First-time setup: installing backend dependencies, this can take a minute...
    call npm install --prefix "%BACKEND%"
    if errorlevel 1 goto :error

    echo First-time setup: approving native module builds...
    call npm approve-scripts --prefix "%BACKEND%" "@prisma/engines" bcrypt better-sqlite3 esbuild prisma
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

    echo First-time setup: creating the first login account...
    call npm run seed:auth --prefix "%BACKEND%"
    if errorlevel 1 goto :error
)

rem A snapshot every time the ERP starts, so a backup exists without anyone
rem having to remember. Never fatal: a failed backup must not stop the factory
rem from working, it just has to say so loudly.
if exist "%BACKEND%\dev.db" (
    echo Backing up the database...
    call npm run backup --prefix "%BACKEND%"
    if errorlevel 1 (
        echo.
        echo [WARNING] The backup FAILED. Starting anyway - but fix this today.
        echo.
        timeout /t 5 /nobreak >nul
    )
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
echo.
echo   First login (change the password after signing in):
echo     Username: gerant
echo     Password: harrix2026
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
