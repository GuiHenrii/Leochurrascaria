@echo off
title Léo Churrascaria - Spooler de Impressao
color 0A
echo ==================================================
echo   BEM VINDO AO CLIENTE DE IMPRESSAO DA CHURRASCARIA 
echo ==================================================
echo.
echo.
echo Verificando dependencias...
if not exist node_modules (
    echo Instalando modulos necessarios (apenas na primeira vez)...
    call npm install
)

node app-impressora.js
pause

