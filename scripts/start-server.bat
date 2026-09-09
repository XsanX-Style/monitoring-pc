@echo off
chcp 65001 >nul
REM Запускает сервер PC Monitor. Можно запускать вручную (двойной клик)
REM или через автозапуск (см. install-autostart.ps1).
cd /d "%~dp0.."
node server\index.js
if errorlevel 1 (
  echo.
  echo Сервер завершился с ошибкой. Проверьте .env и что зависимости установлены (npm install).
  pause
)
