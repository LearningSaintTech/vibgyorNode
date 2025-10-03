# VibgyorNode Port 3000 Cleaner (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   VibgyorNode Port 3000 Cleaner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking for processes using port 3000..." -ForegroundColor Yellow

# Find processes using port 3000
$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($processes.Count -eq 0) {
    Write-Host "✅ No processes found using port 3000" -ForegroundColor Green
    Write-Host "Port is available for use." -ForegroundColor Green
    Read-Host "Press Enter to continue"
    exit 0
}

Write-Host "❌ Found $($processes.Count) process(es) using port 3000:" -ForegroundColor Red
Write-Host ""

foreach ($process in $processes) {
    $pid = $process.OwningProcess
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    $name = if ($proc) { $proc.ProcessName } else { "Unknown" }
    Write-Host "PID: $pid - Process: $name" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Killing processes..." -ForegroundColor Yellow

$killed = 0
foreach ($process in $processes) {
    $pid = $process.OwningProcess
    try {
        Stop-Process -Id $pid -Force -ErrorAction Stop
        Write-Host "✅ Successfully killed process $pid" -ForegroundColor Green
        $killed++
    } catch {
        Write-Host "❌ Failed to kill process $pid - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Port 3000 cleanup completed!" -ForegroundColor Green
Write-Host "Killed $killed process(es). You can now start the server with: npm run dev" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to continue"
