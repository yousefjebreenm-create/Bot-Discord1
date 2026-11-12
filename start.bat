@echo off
title Red Core Clone
color 04
echo.
echo  ██████╗ ███████╗██████╗      ██████╗ ██████╗ ██████╗ ███████╗
echo  ██╔══██╗██╔════╝██╔══██╗    ██╔════╝██╔═══██╗██╔══██╗██╔════╝
echo  ██████╔╝█████╗  ██║  ██║    ██║     ██║   ██║██████╔╝█████╗  
echo  ██╔══██╗██╔══╝  ██║  ██║    ██║     ██║   ██║██╔══██╗██╔══╝  
echo  ██║  ██║███████╗██████╔╝    ╚██████╗╚██████╔╝██║  ██║███████╗
echo  ╚═╝  ╚═╝╚══════╝╚═════╝      ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝
echo.

:: Check Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Install it from: https://nodejs.org
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo [*] Installing dependencies...
    npm install
)

echo [*] Starting Red Core Clone...
echo [*] Opening browser at http://localhost:3000
echo.
node index.js
pause
