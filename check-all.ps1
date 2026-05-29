$ip = (ipconfig | Select-String 'IPv4' | Select-Object -First 1 -ExpandProperty Line) -replace '.*:\s*', ''
$ip = $ip.Trim()

$hostname = [System.Net.Dns]::GetHostName()
$port = 82

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  ACHME CRM - CONNECTIVITY CHECK" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  LAN IP   : $ip" -ForegroundColor White
Write-Host "  Hostname : $hostname" -ForegroundColor White
Write-Host ""

$tests = @(
    "http://localhost:${port}/nginx-health",
    "http://127.0.0.1:${port}/nginx-health",
    "http://${ip}:${port}/nginx-health",
    "http://${hostname}:${port}/nginx-health",
    "http://localhost:${port}/login",
    "http://localhost:5000/api/health"
)

foreach ($url in $tests) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Host ("  [OK]   " + $url + "  (HTTP " + $r.StatusCode + ")") -ForegroundColor Green
    } catch {
        $msg = $_.Exception.Message -replace "`n", ""
        Write-Host ("  [FAIL] " + $url + "  -> " + $msg) -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "  PM2 Status:" -ForegroundColor Cyan
& pm2 list 2>$null | Select-String "achme"
Write-Host ""
