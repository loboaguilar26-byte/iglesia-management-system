# Verificación completa del proyecto: lint, tipos, pruebas, build y E2E.
# Uso (desde la carpeta del proyecto):  powershell -ExecutionPolicy Bypass -File scripts\verify.ps1
# Escribe el resultado en verify.log (ignorado por git).
$log = Join-Path $PSScriptRoot "..\verify.log"
"Verificación iniciada: $(Get-Date -Format s)" | Out-File $log -Encoding utf8
$steps = @(
  @{ name = "lint"; cmd = "pnpm lint" },
  @{ name = "typecheck"; cmd = "pnpm typecheck" },
  @{ name = "test"; cmd = "pnpm test" },
  @{ name = "build"; cmd = "pnpm build" },
  @{ name = "e2e"; cmd = "pnpm test:e2e" }
)
foreach ($s in $steps) {
  "`n===== $($s.name) =====" | Out-File $log -Append -Encoding utf8
  $job = Start-Job -ScriptBlock { param($c, $d) Set-Location $d; cmd /c "$c 2>&1" } -ArgumentList $s.cmd, (Resolve-Path "$PSScriptRoot\..")
  # El paso E2E puede quedar colgado en Windows al cerrar el servidor: límite de 6 minutos.
  if (-not (Wait-Job $job -Timeout 360)) { "TIEMPO AGOTADO (posible cierre colgado del servidor)" | Out-File $log -Append -Encoding utf8; Stop-Job $job }
  Receive-Job $job | Out-File $log -Append -Encoding utf8
  Remove-Job $job -Force
}
$p = Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue
if ($p) { Stop-Process -Id $p.OwningProcess -Force }
"`nVerificación terminada: $(Get-Date -Format s)" | Out-File $log -Append -Encoding utf8
Write-Host "Listo. Resultado en verify.log"
