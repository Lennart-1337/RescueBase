param(
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$EnvExample = ".env.staging.example",
  [string]$EnvFile = ".env.staging"
)

$ResolvedProjectDir = (Resolve-Path $ProjectDir).Path
$ResolvedEnvExample = Join-Path $ResolvedProjectDir $EnvExample
$ResolvedEnvFile = Join-Path $ResolvedProjectDir $EnvFile

git --version | Out-Null
docker version | Out-Null
docker compose version | Out-Null

New-Item -ItemType Directory -Force -Path (Join-Path $ResolvedProjectDir "backups") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ResolvedProjectDir "keys") | Out-Null
$DisabledRestoreFile = Join-Path $ResolvedProjectDir "keys\restore-disabled.txt"
if (-not (Test-Path $DisabledRestoreFile)) {
  Set-Content -Path $DisabledRestoreFile -Value "restore disabled"
}

if (-not (Test-Path $ResolvedEnvFile)) {
  Copy-Item -Path $ResolvedEnvExample -Destination $ResolvedEnvFile
}

Write-Host "Windows staging bootstrap completed at $ResolvedProjectDir"
Write-Host "Next:"
Write-Host "  1. Edit $ResolvedEnvFile"
Write-Host "  2. Place your Cloudflare Origin Certificate and private key on the Windows filesystem"
Write-Host "  3. Set CLOUDFLARE_ORIGIN_CERT_HOST_FILE and CLOUDFLARE_ORIGIN_KEY_HOST_FILE in $ResolvedEnvFile"
Write-Host "  4. Leave BACKUP_AGE_RECIPIENT empty to disable encrypted backups for now"
Write-Host "  5. Keep AGE_IDENTITY_FILE as a Linux container path such as /run/secrets/staging.agekey"
Write-Host "  6. Set GHCR_USERNAME and GHCR_TOKEN, then run .\scripts\windows-staging\deploy-staging.ps1"
