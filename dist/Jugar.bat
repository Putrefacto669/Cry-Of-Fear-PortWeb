@echo off
rem Jugar.bat - Abre Cry of Fear Web en el navegador desde esta carpeta (doble clic).
rem Necesita Python 3 en Windows: https://www.python.org/downloads/
rem Deja esta ventana abierta mientras juegas; cerrarla apaga el servidor local.
setlocal
cd /d "%~dp0"
title Cry of Fear Web - servidor local

rem "python" puede ser el acceso directo de Microsoft Store, que solo abre la tienda:
rem se comprueba que de verdad ejecuta Python 3 antes de usarlo
set "PY="
py -3 -c "import sys" >nul 2>nul && set "PY=py -3"
if not defined PY python -c "import sys; sys.exit(sys.version_info[0] != 3)" >nul 2>nul && set "PY=python"
if not defined PY (
    echo No se ha encontrado Python 3.
    echo Instalalo desde https://www.python.org/downloads/ y vuelve a abrir Jugar.bat.
    pause
    exit /b 1
)

echo Cry of Fear (c) Team Psykskallar - port web no oficial, sin fines de lucro.
echo.
echo Abriendo http://localhost:8080/ ...  (cierra esta ventana para terminar)
%PY% serve.py . --port 8080 --open
if errorlevel 1 pause
