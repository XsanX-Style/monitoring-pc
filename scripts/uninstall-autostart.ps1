# Убирает автозапуск, поставленный install-autostart.ps1.
$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder 'PC Monitor.lnk'

if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "Автозапуск убран." -ForegroundColor Green
} else {
    Write-Host "Автозапуск и так не был настроен (ярлык не найден)." -ForegroundColor Yellow
}
