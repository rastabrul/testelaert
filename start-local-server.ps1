$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$log = Join-Path $root "local-server.log"

try {
  Set-Location -LiteralPath $root
  $node = (Get-Command node -ErrorAction Stop).Source
  "Starting Quiz MIDE with $node at $(Get-Date -Format o)" | Out-File -LiteralPath $log -Encoding utf8
  & $node (Join-Path $root "server.js") *>> $log
} catch {
  "Failed to start Quiz MIDE at $(Get-Date -Format o)" | Out-File -LiteralPath $log -Encoding utf8
  $_ | Out-String | Add-Content -LiteralPath $log -Encoding utf8
  Start-Sleep -Seconds 8
}
