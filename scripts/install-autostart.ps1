# Запусти один раз: .\scripts\install-autostart.ps1
# Ставит ярлык в папку автозагрузки Windows — сервер PC Monitor будет
# сам запускаться каждый раз при входе в твою учётку, без ручного
# открытия PowerShell.
# Убрать автозапуск: .\scripts\uninstall-autostart.ps1

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent $scriptDir
$batPath = Join-Path $scriptDir 'start-server.bat'

if (-not (Test-Path $batPath)) {
    Write-Host "Не найден $batPath — запускай этот скрипт из папки проекта (scripts\install-autostart.ps1)." -ForegroundColor Red
    exit 1
}

$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder 'PC Monitor.lnk'

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $batPath
$Shortcut.WorkingDirectory = $projectDir
$Shortcut.WindowStyle = 7  # Свёрнутое окно
$Shortcut.Description = 'PC Monitor - сервер удалённого мониторинга и управления'
$Shortcut.Save()

Write-Host ""
Write-Host "Готово! Сервер PC Monitor теперь будет сам запускаться при входе в Windows." -ForegroundColor Green
Write-Host "Ярлык создан здесь: $shortcutPath"
Write-Host ""
Write-Host "Чтобы проверить прямо сейчас, не перезагружая ПК, дважды кликни по этому ярлыку" -ForegroundColor Yellow
Write-Host "или просто перезайди в свою учётку Windows."
