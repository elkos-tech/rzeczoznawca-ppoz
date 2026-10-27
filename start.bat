@echo off
chcp 65001 >nul
title Rzeczoznawca PPOZ - serwer nauki
cd /d "%~dp0"
echo.
echo  ================================================
echo   Rzeczoznawca PPOZ - aplikacja do nauki
echo   Serwer lokalny: http://127.0.0.1:8777
echo   Z telefonu w tej samej sieci Wi-Fi:
echo   http://ADRES-IP-KOMPUTERA:8777
echo   (Zamknij to okno, aby zatrzymac serwer)
echo  ================================================
echo.
start "" "http://127.0.0.1:8777/index.html"
python -m http.server 8777 --bind 0.0.0.0
pause
