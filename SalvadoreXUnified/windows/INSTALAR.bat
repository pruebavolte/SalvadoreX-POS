@echo off
title SalvadoreX POS
cd /d "%~dp0"
echo Compilando SalvadoreX POS...
dotnet publish SalvadoreXPOS.csproj -c Release -r win-x64 --self-contained -o publish
copy /Y config.json publish\ >nul 2>nul
echo LISTO!
start "" publish\SalvadoreXPOS.exe
