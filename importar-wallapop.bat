@echo off
chcp 65001 >nul
setlocal

echo.
echo  ================================================
echo   Importar anuncios de Wallapop a BoxSell
echo  ================================================
echo.

REM ── Ruta de Chrome ────────────────────────────────────────────────────────────
set "CHROME=%PROGRAMFILES%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" (
  echo  ERROR: No se encontro Chrome en la ruta habitual.
  echo  Edita este archivo y ajusta la variable CHROME manualmente.
  pause
  exit /b 1
)

REM ── 1. Cerrar Chrome si esta abierto ─────────────────────────────────────────
echo  [1/4] Cerrando Chrome si esta abierto...
taskkill /F /IM chrome.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM ── 2. Abrir Chrome con depuracion remota y navegar a Wallapop ───────────────
echo  [2/4] Abriendo Chrome con remote-debugging-port=9222...
start "" "%CHROME%" --remote-debugging-port=9222 --user-data-dir="%LOCALAPPDATA%\Google\Chrome\User Data" "https://es.wallapop.com"

REM ── 3. Esperar 3 segundos a que Chrome arranque ───────────────────────────────
echo  [3/4] Esperando 3 segundos...
timeout /t 3 /nobreak >nul

REM ── 4. Instrucciones al usuario ───────────────────────────────────────────────
echo.
echo  ================================================
echo   Inicia sesion en Wallapop si no lo has hecho.
echo   Cuando estes listo, pulsa cualquier tecla
echo   para comenzar la importacion.
echo  ================================================
echo.
pause

REM ── 5. Ejecutar el script de importacion ─────────────────────────────────────
echo.
echo  [4/4] Ejecutando npm run import:wallapop...
echo.
cd /d "%~dp0"
npm run import:wallapop

echo.
echo  ================================================
echo   Proceso finalizado.
echo   El archivo exportado esta en:
echo   scripts\wallapop-export.json
echo   Importalo en BoxSell desde Ajustes > Importar
echo  ================================================
echo.
pause
