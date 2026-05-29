Set-Location 'C:\nginx'
Start-Process 'C:\nginx\nginx.exe' -WorkingDirectory 'C:\nginx' -WindowStyle Hidden
Start-Sleep -Seconds 3
$proc = Get-Process nginx -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host ("Nginx running - PID " + $proc.Id) -ForegroundColor Green
} else {
    Write-Host "Nginx failed to start. Checking error log..." -ForegroundColor Red
    if (Test-Path 'C:\nginx\logs\error.log') {
        Get-Content 'C:\nginx\logs\error.log' -Tail 10
    }
}

Start-Sleep -Seconds 1
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:82/nginx-health' -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host ("localhost:82 OK - " + $r.Content) -ForegroundColor Green
} catch {
    Write-Host ("localhost:82 FAIL - " + $_.Exception.Message) -ForegroundColor Red
}
