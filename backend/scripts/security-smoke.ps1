param(
    [string]$BaseUrl = "http://127.0.0.1:7085"
)

$ErrorActionPreference = "Stop"

function Test-BaseUrl {
    param([string]$Url)
    try {
        Invoke-WebRequest -Uri "$Url/api/Auth/me" -Method GET -UseBasicParsing -TimeoutSec 8 | Out-Null
        return $true
    }
    catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode -eq 401) {
            return $true
        }
        return $false
    }
}

function Get-StatusCode {
    param($ErrorRecord)
    if ($ErrorRecord.Exception.Response -and $ErrorRecord.Exception.Response.StatusCode) {
        return [int]$ErrorRecord.Exception.Response.StatusCode
    }
    return -1
}

$results = @()

if (-not (Test-BaseUrl -Url $BaseUrl)) {
    $fallbacks = @(
        "http://127.0.0.1:5152",
        "http://localhost:5152",
        "http://localhost:7085"
    )

    foreach ($candidate in $fallbacks) {
        if ($candidate -eq $BaseUrl) { continue }
        if (Test-BaseUrl -Url $candidate) {
            $BaseUrl = $candidate
            break
        }
    }
}

$results += [pscustomobject]@{ Test = "BaseUrl usada"; Resultado = "INFO"; Detalle = $BaseUrl }

try {
    Invoke-WebRequest -Uri "$BaseUrl/api/Auth/me" -Method GET -UseBasicParsing | Out-Null
    $results += [pscustomobject]@{ Test = "API Reachability"; Resultado = "OK"; Detalle = "Respondio endpoint base" }
}
catch {
    $code = Get-StatusCode $_
    if ($code -eq 401) {
        $results += [pscustomobject]@{ Test = "API Reachability"; Resultado = "OK"; Detalle = "Respondio 401 (esperado sin token)" }
    }
    else {
        $results += [pscustomobject]@{ Test = "API Reachability"; Resultado = "FALLO"; Detalle = "HTTP $code" }
    }
}

try {
    Invoke-WebRequest -Uri "$BaseUrl/api/Cajas/abiertas" -Method GET -UseBasicParsing | Out-Null
    $results += [pscustomobject]@{ Test = "GET /api/Cajas/abiertas sin token"; Resultado = "FALLO"; Detalle = "Respondio 2xx sin token" }
}
catch {
    $code = Get-StatusCode $_
    $ok = $code -eq 401
    $results += [pscustomobject]@{ Test = "GET /api/Cajas/abiertas sin token"; Resultado = $(if ($ok) { "OK" } else { "FALLO" }); Detalle = "HTTP $code" }
}

try {
    Invoke-WebRequest -Uri "$BaseUrl/api/Auth/login?usuario=admin&clave=123" -Method POST -UseBasicParsing | Out-Null
    $results += [pscustomobject]@{ Test = "POST /api/Auth/login por query"; Resultado = "FALLO"; Detalle = "Permitio querystring" }
}
catch {
    $code = Get-StatusCode $_
    $ok = $code -eq 400 -or $code -eq 429
    $results += [pscustomobject]@{ Test = "POST /api/Auth/login por query"; Resultado = $(if ($ok) { "OK" } else { "FALLO" }); Detalle = "HTTP $code" }
}

$codes = @()
$testUser = "stress_{0}" -f ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())
for ($i = 1; $i -le 6; $i++) {
    try {
        $body = @{ usuario = $testUser; clave = "malaclave" } | ConvertTo-Json
        Invoke-WebRequest -Uri "$BaseUrl/api/Auth/login" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing | Out-Null
        $codes += 200
    }
    catch {
        $codes += (Get-StatusCode $_)
    }
}

$has401 = $codes -contains 401
$has429 = $codes -contains 429
$all429 = ($codes | Where-Object { $_ -eq 429 }).Count -eq $codes.Count
$results += [pscustomobject]@{
    Test = "Bloqueo por intentos fallidos";
    Resultado = $(if (($has401 -and $has429) -or $all429) { "OK" } else { "FALLO" });
    Detalle = ($codes -join ",")
}

try {
    Invoke-WebRequest -Uri "$BaseUrl/api/Auth/me" -Method GET -UseBasicParsing | Out-Null
    $results += [pscustomobject]@{ Test = "Headers seguridad"; Resultado = "FALLO"; Detalle = "Endpoint respondio 2xx sin auth" }
}
catch {
    $resp = $_.Exception.Response
    if ($null -eq $resp) {
        $results += [pscustomobject]@{ Test = "Headers seguridad"; Resultado = "FALLO"; Detalle = "No hubo Response" }
    }
    else {
        $headers = $resp.Headers
        $checks = @(
            [pscustomobject]@{ Key = "X-Content-Type-Options"; Ok = ($headers["X-Content-Type-Options"] -eq "nosniff") },
            [pscustomobject]@{ Key = "X-Frame-Options"; Ok = ($headers["X-Frame-Options"] -eq "DENY") },
            [pscustomobject]@{ Key = "Content-Security-Policy"; Ok = (-not [string]::IsNullOrWhiteSpace($headers["Content-Security-Policy"])) },
            [pscustomobject]@{ Key = "Referrer-Policy"; Ok = ($headers["Referrer-Policy"] -eq "no-referrer") }
        )
        $allOk = ($checks | Where-Object { -not $_.Ok }).Count -eq 0
        $detalle = ($checks | ForEach-Object { "$($_.Key)=$($_.Ok)" }) -join "; "
        $results += [pscustomobject]@{ Test = "Headers seguridad"; Resultado = $(if ($allOk) { "OK" } else { "FALLO" }); Detalle = $detalle }
    }
}

$results | Format-Table -AutoSize
