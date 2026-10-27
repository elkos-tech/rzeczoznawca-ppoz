@echo off
chcp 65001 >nul
title Rzeczoznawca PPOZ - TEST
cd /d "%~dp0"

set PORT=8787
set PY=

rem --- szukanie Pythona (python / py / python3) ---
where python >nul 2>&1
if %errorlevel%==0 set PY=python
if defined PY goto HAVEPY
where py >nul 2>&1
if %errorlevel%==0 set PY=py
if defined PY goto HAVEPY
where python3 >nul 2>&1
if %errorlevel%==0 set PY=python3
:HAVEPY
if not defined PY goto NOPY

echo.
echo  ==============================================
echo    RZECZOZNAWCA PPOZ - EGZAMIN PROBNY
echo  ==============================================
echo    Serwer:  http://127.0.0.1:%PORT%
echo.
echo    Z telefonu w tej samej sieci Wi-Fi wejdz na:
echo    http://ADRES-IP-KOMPUTERA:%PORT%/index.html
echo    (adres IP sprawdzisz komenda:  ipconfig )
echo  ==============================================
echo.

start "Serwer RzeczoznawcaPPOZ" /min %PY% -m http.server %PORT% --bind 0.0.0.0
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:%PORT%/index.html#egzamin"

echo  Test otwarty w przegladarce.
echo.
echo  Przydatne adresy:
echo    .../index.html#egzamin  - egzamin probny (40 pytan / 40 min)
echo    .../index.html#nowe     - tylko NOWE pytania
echo    .../index.html#nauka    - tryb nauki (wybor dzialu)
echo    .../index.html#akty     - akty prawne (PDF offline)
echo.
echo  Aby ZAKONCZYC - nacisnij dowolny klawisz w tym oknie.
pause >nul
taskkill /FI "WINDOWTITLE eq Serwer RzeczoznawcaPPOZ*" /F >nul 2>&1
exit /b

:NOPY
echo.
echo  Nie znaleziono Pythona w systemie.
echo  Otwieram aplikacje bezposrednio z pliku (tryb awaryjny).
echo  Dziala nauka i egzamin; nie dziala instalacja jako aplikacja (PWA).
echo.
start "" "%~dp0index.html#egzamin"
timeout /t 6 /nobreak >nul
exit /b
