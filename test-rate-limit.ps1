# Rate Limiting Test Script
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJzdWJzY3JpYmVyTm8iOm51bGwsImlhdCI6MTc2NDM2NjMzOSwiZXhwIjoxNzY0NDUyNzM5fQ.7CqIvz2H4vZUPS80gkVg6EhlbgIk0XXR_9i2nrf_Oyg"
$headers = @{"Authorization"="Bearer $token"}

Write-Host "`n=== Rate Limiting Testi ===" -ForegroundColor Yellow
Write-Host "Endpoint: GET /api/v1/bills/query" -ForegroundColor Cyan
Write-Host "Subscriber: 5551234567" -ForegroundColor Cyan
Write-Host "Limit: 3 çağrı/gün" -ForegroundColor Cyan
Write-Host ""

for ($i = 1; $i -le 4; $i++) {
    Write-Host "$i. Çağrı:" -ForegroundColor $(if($i -eq 4){"Yellow"}else{"White"})
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/bills/query?subscriber_no=5551234567&month=11&year=2024" -Headers $headers -ErrorAction Stop
        
        Write-Host "   ✅ Status: $($response.StatusCode) - BAŞARILI" -ForegroundColor Green
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($statusCode -eq 429) {
            Write-Host "   ❌ Status: 429 - RATE LIMIT AŞILDI! ✅" -ForegroundColor Green
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "   Response: $responseBody" -ForegroundColor Yellow
        } else {
            Write-Host "   ❌ Status: $statusCode" -ForegroundColor Red
        }
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host "`nTest tamamlandı!" -ForegroundColor Cyan

