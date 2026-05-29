Start-Sleep -Seconds 2
$urls = @(
    "http://localhost:82/nginx-health",
    "http://localhost:82/",
    "http://localhost:82/login"
)
foreach ($url in $urls) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Host ("[OK]  $url  ->  Status $($r.StatusCode)") -ForegroundColor Green
    } catch {
        Write-Host ("[FAIL] $url  ->  $($_.Exception.Message)") -ForegroundColor Red
    }
}
