@echo off
title SecureChat - Unified Web & Mobile Server
color 0A

echo =======================================================================
echo          SECURECHAT PERMANENT LAUNCHER (WEB ^& USB MOBILE)
echo =======================================================================
echo.

set PROJECT_DIR=c:\Users\panig\OneDrive\Desktop\SecureChat
cd /d "%PROJECT_DIR%"

:: 1. Check & Configure ADB USB Port Forwarding
set ADB_PATH=C:\Users\panig\AppData\Local\Android\Sdk\platform-tools\adb.exe
if not exist "%ADB_PATH%" (
    where adb >nul 2>&1
    if %errorlevel% equ 0 (
        set ADB_PATH=adb
    )
)

if exist "%ADB_PATH%" (
    echo [1/4] Checking connected Android USB devices via ADB...
    "%ADB_PATH%" start-server >nul 2>&1
    "%ADB_PATH%" devices | findstr /R "device$" >nul
    if %errorlevel% equ 0 (
        echo  [+] Android USB device detected! Setting up reverse port forwarding...
        "%ADB_PATH%" reverse tcp:3001 tcp:3001 >nul 2>&1
        "%ADB_PATH%" reverse tcp:5173 tcp:5173 >nul 2>&1
        echo  [+] USB Port Forwarding Active: Mobile app connects via http://localhost:3001
    ) else (
        echo  [-] No USB device detected. If testing on phone via USB, plug in USB and enable USB debugging.
    )
) else (
    echo  [-] ADB not found. Skipping USB reverse port setup.
)

:: 2. Free Port 3001 if occupied by previous run
echo.
echo [2/4] Verifying port 3001 availability...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo  [!] Freeing port 3001 from PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

:: 3. Find current Wi-Fi IP address
echo.
echo [3/4] Finding local network IP for wireless connections...
set LOCAL_IP=127.0.0.1
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4 Address" ^| findstr /v "169.254" ^| findstr /v "192.168.187" ^| findstr /v "192.168.176"') do (
    set LOCAL_IP=%%i
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP: =%

:: 4. Start Server and Launch Browser
echo.
echo [4/4] Starting SecureChat Unified Server on Port 3001...
start "SecureChat Server Daemon" /min cmd /c "node server.js"

:: Wait 2 seconds for server boot
timeout /t 2 /nobreak >nul

:: Launch Web Browser
start "" "http://localhost:3001"

echo.
echo =======================================================================
echo                     SECURECHAT IS NOW LIVE!
echo =======================================================================
echo.
echo   * Web Localhost Link  : http://localhost:3001
echo   * Mobile (USB Cable)  : http://localhost:3001  (ADB Reversed)
echo   * Mobile (Wi-Fi)      : http://%LOCAL_IP%:3001
echo.
echo   Database              : Unified SQLite / JSON (Single shared DB)
echo   Moments Policy        : 24h retention + manual delete
echo   Calling Audio         : WebRTC Audio Engine with zero ringing lag
echo.
echo =======================================================================
echo Server is running. Keep this window or the minimized server window open.
echo To stop server, press any key.
pause >nul
taskkill /F /IM node.exe >nul 2>&1
