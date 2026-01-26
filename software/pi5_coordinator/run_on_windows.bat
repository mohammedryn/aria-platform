@echo off
TITLE A.R.I.A. Vision Test (Windows)
CLS

ECHO ========================================================
ECHO    A.R.I.A. Vision System - Windows Test Launcher
ECHO ========================================================
ECHO.

:: Check for Python
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO [ERROR] Python is not installed or not in PATH.
    ECHO Please install Python from python.org and check "Add to PATH".
    PAUSE
    EXIT /B
)

:: Create Virtual Env if missing
IF NOT EXIST "venv" (
    ECHO [INFO] Creating virtual environment...
    python -m venv venv
)

:: Activate Venv
CALL venv\Scripts\activate

:: Install dependencies
ECHO [INFO] Checking dependencies...
pip install -q -r requirements.txt

:: Ask for API Key if not set
IF "%GEMINI_API_KEY%"=="" (
    ECHO.
    ECHO [SETUP] GEMINI_API_KEY is not set.
    SET /P GEMINI_API_KEY="Enter your Gemini API Key: "
    SETX GEMINI_API_KEY "%GEMINI_API_KEY%"
)

:: Run Test
CLS
ECHO [INFO] Starting Vision Test...
ECHO [INFO] Using Camera: Auto-Detect (Default)
ECHO.
python src/test_vision_gemini.py --camera webcam

PAUSE
