Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$Branch = "staging",
  [string]$EnvFile = ".env.staging",
  [string]$ImageTag = ""
)

function Assert-LastExitCode([string]$CommandName) {
  if ($LASTEXITCODE -ne 0) {
    throw "$CommandName failed with exit code $LASTEXITCODE."
  }
}

function Set-EnvValue([string]$Path, [string]$Key, [string]$Value) {
  $lines = Get-Content -Path $Path
  if ($lines -match "^$Key=") {
    $lines = $lines | ForEach-Object { if ($_ -match "^$Key=") { "$Key=$Value" } else { $_ } }
  } else {
    $lines += "$Key=$Value"
  }
  Set-Content -Path $Path -Value $lines
}

function Get-EnvValue([string]$Path, [string]$Key) {
  $match = Get-Content -Path $Path | Select-String -Pattern "^$Key=(.*)$" | Select-Object -Last 1
  if ($null -eq $match) {
    return ""
  }
  return $match.Matches[0].Groups[1].Value
}

$ResolvedProjectDir = (Resolve-Path $ProjectDir).Path
$ResolvedEnvFile = if ([IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $ResolvedProjectDir $EnvFile }
$ComposeFile = Join-Path $ResolvedProjectDir "docker-compose.yml"
$ComposeStagingFile = Join-Path $ResolvedProjectDir "docker-compose.staging.yml"
$ComposeArgs = @("--project-directory", $ResolvedProjectDir, "--env-file", $ResolvedEnvFile, "-f", $ComposeFile, "-f", $ComposeStagingFile)

if (-not (Test-Path $ResolvedEnvFile)) {
  throw "Environment file not found: $ResolvedEnvFile"
}
if (-not (Test-Path $ComposeFile)) {
  throw "Compose file not found: $ComposeFile"
}
if (-not (Test-Path $ComposeStagingFile)) {
  throw "Compose file not found: $ComposeStagingFile"
}
if (-not $env:GHCR_USERNAME) { throw "GHCR_USERNAME environment variable is required." }
if (-not $env:GHCR_TOKEN) { throw "GHCR_TOKEN environment variable is required." }

if (Test-Path (Join-Path $ResolvedProjectDir ".git")) {
  git -C $ResolvedProjectDir fetch --all --prune
  Assert-LastExitCode "git fetch"
  git -C $ResolvedProjectDir checkout $Branch
  Assert-LastExitCode "git checkout"
  git -C $ResolvedProjectDir pull --ff-only origin $Branch
  Assert-LastExitCode "git pull"
} else {
  Write-Warning "No .git directory found in $ResolvedProjectDir. Skipping git fetch/checkout/pull."
}

if ($ImageTag) {
  Set-EnvValue -Path $ResolvedEnvFile -Key "IMAGE_TAG" -Value $ImageTag
}

$OriginCert = Get-EnvValue -Path $ResolvedEnvFile -Key "CLOUDFLARE_ORIGIN_CERT_HOST_FILE"
$OriginKey = Get-EnvValue -Path $ResolvedEnvFile -Key "CLOUDFLARE_ORIGIN_KEY_HOST_FILE"
if ([string]::IsNullOrWhiteSpace($OriginCert)) {
  throw "CLOUDFLARE_ORIGIN_CERT_HOST_FILE is required in $ResolvedEnvFile."
}
if ([string]::IsNullOrWhiteSpace($OriginKey)) {
  throw "CLOUDFLARE_ORIGIN_KEY_HOST_FILE is required in $ResolvedEnvFile."
}
if (-not (Test-Path $OriginCert)) {
  throw "Cloudflare origin certificate not found: $OriginCert"
}
if (-not (Test-Path $OriginKey)) {
  throw "Cloudflare origin key not found: $OriginKey"
}

$env:GHCR_TOKEN | docker login ghcr.io -u $env:GHCR_USERNAME --password-stdin
Assert-LastExitCode "docker login"
docker compose @ComposeArgs pull
Assert-LastExitCode "docker compose pull"
docker compose @ComposeArgs up -d --no-build --remove-orphans
Assert-LastExitCode "docker compose up"
docker compose @ComposeArgs ps
Assert-LastExitCode "docker compose ps"

$EffectiveTag = (Get-Content -Path $ResolvedEnvFile | Select-String '^IMAGE_TAG=' | Select-Object -Last 1).ToString().Split("=", 2)[1]
Write-Host "Deployed IMAGE_TAG=$EffectiveTag"
