@echo off
setlocal
cd /d "%~dp0"
title INTERCAMBIO - Capitulo 1 A Despedida
if not exist "package.json" goto missing
where node >nul 2>&1
if errorlevel 1 goto nodeMissing
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 goto nodeMissing
if exist "dist\index.html" (
  echo Iniciando a versao pronta de O Intercambio...
  node scripts\serve-built.mjs --open
  if errorlevel 1 goto failure
  exit /b 0
)
where npm.cmd >nul 2>&1
if errorlevel 1 goto nodeMissing
if not exist "node_modules\.bin\vite.cmd" (
  echo Preparando O Intercambio. Aguarde a instalacao terminar...
  call npm.cmd ci
  if errorlevel 1 goto failure
)
echo Abrindo O Intercambio em http://localhost:5180
echo Mantenha esta janela aberta enquanto joga.
call npm.cmd run dev -- --open
if errorlevel 1 goto failure
exit /b 0
:nodeMissing
echo Instale o Node.js 24 ou superior em https://nodejs.org e abra este arquivo novamente.
pause
exit /b 1
:missing
echo Extraia o ZIP inteiro e abra este arquivo na pasta que contem package.json.
pause
exit /b 1
:failure
echo Nao foi possivel iniciar. Confira a mensagem acima.
echo Se a porta 5180 estiver ocupada, feche a outra janela deste jogo e tente novamente.
echo Fechar somente a aba do navegador nao encerra o servidor.
pause
exit /b 1
