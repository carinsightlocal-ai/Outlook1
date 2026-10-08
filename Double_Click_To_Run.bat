@echo off
title Jaun Fetch Otp - Pro Edition
echo ========================================================
echo     Jaun Fetch Otp - OTP Fetcher Pro
echo     Support WhatsApp: 03361849934
echo     Buy Outlook & Hotmail Accounts @ Price 10
echo ========================================================
echo.
echo Launching Jaun Fetch Otp in your browser...
echo Local URL:   http://localhost:8000
echo.
start http://localhost:8000
python -m uvicorn server:app --host 0.0.0.0 --port 8000
pause
