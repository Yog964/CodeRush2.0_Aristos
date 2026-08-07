@echo off
echo ===================================================
echo     AE-01 Unified Agentic Coding Harness CLI
echo ===================================================
echo.

set /p REPO_PATH="Enter repository path (e.g. D:\path\to\repo or https://github.com/...): "
set /p ISSUE="Enter issue statement or feature request: "

echo.
echo Starting Agentic Harness...
echo.

python main.py "%REPO_PATH%" "%ISSUE%"

echo.
pause
