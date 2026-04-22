$body = '{ "empId": "AQ-SA001", "password": "Admin@123" }'
$r1 = Invoke-RestMethod -Uri 'https://aquagrow.onrender.com/api/hrms/auth/login' -Method POST -ContentType 'application/json' -Body $body -TimeoutSec 20
$tok = $r1.token
$auth = "Bearer $tok"
$r2 = Invoke-RestMethod -Uri 'https://aquagrow.onrender.com/api/hrms/candidates' -Method GET -Headers @{ Authorization = $auth } -TimeoutSec 20
Write-Host "Count: $($r2.Count)"
for ($i = 0; $i -lt [Math]::Min(3, $r2.Count); $i++) {
    Write-Host "[$i] ID=$($r2[$i]._id) Name=$($r2[$i].name) Status=$($r2[$i].status)"
}
