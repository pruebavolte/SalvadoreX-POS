@echo off
title SalvadoreX POS - Instalador
color 0B
echo.
echo  ========================================
echo      SALVADOREX POS - INSTALADOR
echo  ========================================
echo.
cd /d "%~dp0"
echo Verificando .NET SDK...
where dotnet >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: .NET SDK no instalado
    echo Descarga de: https://dotnet.microsoft.com/download/dotnet/8.0
    pause
    exit /b 1
)
echo Restaurando paquetes...
dotnet restore SalvadoreXPOS.csproj
echo Compilando...
dotnet publish SalvadoreXPOS.csproj -c Release -r win-x64 --self-contained true -o publish
copy /Y "config.json" "publish\config.json" >nul 2>nul
echo.
echo ========================================
echo   LISTO! Ejecutable en: publish\SalvadoreXPOS.exe
echo ========================================
start "" "publish\SalvadoreXPOS.exe"
pause
