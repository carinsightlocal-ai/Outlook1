@echo off
title Jaun Fetch Otp - OTP Fetcher Pro
echo ========================================================
echo     Jaun Fetch Otp - OTP Fetcher Pro
echo     Support WhatsApp: 03361849934
echo     Buy Outlook & Hotmail Accounts @ Price 10
echo ========================================================
echo.
echo Launching Jaun Fetch Otp Web Application...
echo Local Link:   http://localhost:8000
echo Mobile Link:  http://%COMPUTERNAME%:8000
echo.
echo Press CTRL+C to stop.
echo ========================================================
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
pause
