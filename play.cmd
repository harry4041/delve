@echo off
rem Double-click to play Delve locally. Starts the dev server and opens your browser.
rem (The game uses ES modules, so index.html cannot be opened directly from disk.)
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install it from https://nodejs.org or open a NEW terminal window and try again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing dependencies, first run only...
  call npm install
)
call npm run dev -- --open
pause
