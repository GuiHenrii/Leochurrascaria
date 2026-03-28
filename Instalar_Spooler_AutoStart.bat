@echo off
title Léo Churrascaria - Instalador Automático
color 0E
echo =========================================================
echo  INSTALANDO O SPOOLER DA IMPRESSORA NA INICIALIZACAO
echo =========================================================
echo.

set "startupFolder=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "shortcutName=Léo_Spooler_Impressao.lnk"
set "targetScript=%~dp0Iniciar_Impressora.bat"
set "workingDir=%~dp0"

echo Criando o atalho mágico...

:: Cria um script VBS temporário para fabricar um Atalho do Windows (LNK)
echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%startupFolder%\%shortcutName%" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%targetScript%" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%workingDir%" >> CreateShortcut.vbs
echo oLink.Description = "Mini Sistema do Léo" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

cscript CreateShortcut.vbs /nologo
del CreateShortcut.vbs

echo.
echo =========================================================
echo  [SUCESSO] O seu computador foi programado!
echo  Da proxima vez que o Windows for ligado amanha de manha,
echo  a telinha verde do Spooler vai pular sozinha na tela!
echo =========================================================
echo  create by: Guilherme Henrique!
echo =========================================================
echo.
pause
