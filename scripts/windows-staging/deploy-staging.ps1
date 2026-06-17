param(
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$Branch = "staging",
  [string]$EnvFile = ".env.staging",
  [string]$ImageTagOverride = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-LastExitCode([string]$CommandName) {
  if ($LASTEXITCODE -ne 0) {
    throw "$CommandName failed with exit code $LASTEXITCODE."
  }
}

function Get-EnvValue([string]$Path, [string]$Key) {
  $match = Get-Content -Path $Path | Select-String -Pattern "^$Key=(.*)$" | Select-Object -Last 1
  if ($null -eq $match) {
    return ""
  }
  return $match.Matches[0].Groups[1].Value
}

function Require-EnvValue([string]$Path, [string]$Key) {
  $value = Get-EnvValue -Path $Path -Key $Key
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing $Key in $Path."
  }
  return $value
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
if (-not (Test-Path (Join-Path $ResolvedProjectDir ".git"))) {
  throw "Missing git checkout in $ResolvedProjectDir."
}

git -C $ResolvedProjectDir fetch --all --prune
Assert-LastExitCode "git fetch"
git -C $ResolvedProjectDir checkout $Branch
Assert-LastExitCode "git checkout"
git -C $ResolvedProjectDir pull --ff-only origin $Branch
Assert-LastExitCode "git pull"

Get-EnvValue -Path $ResolvedEnvFile -Key "API_IMAGE" | Out-Null
Get-EnvValue -Path $ResolvedEnvFile -Key "WEB_IMAGE" | Out-Null
$DefaultImageTag = Require-EnvValue -Path $ResolvedEnvFile -Key "IMAGE_TAG"
$null = Require-EnvValue -Path $ResolvedEnvFile -Key "MARIADB_DATABASE"
$null = Require-EnvValue -Path $ResolvedEnvFile -Key "MARIADB_USER"
$null = Require-EnvValue -Path $ResolvedEnvFile -Key "MARIADB_PASSWORD"
$null = Require-EnvValue -Path $ResolvedEnvFile -Key "APP_PUBLIC_URL"
$null = Require-EnvValue -Path $ResolvedEnvFile -Key "JWT_SECRET"
$null = Require-EnvValue -Path $ResolvedEnvFile -Key "RESEND_API_KEY"
$null = Require-EnvValue -Path $ResolvedEnvFile -Key "RESEND_FROM"
$OriginCert = Require-EnvValue -Path $ResolvedEnvFile -Key "CLOUDFLARE_ORIGIN_CERT_HOST_FILE"
$OriginKey = Require-EnvValue -Path $ResolvedEnvFile -Key "CLOUDFLARE_ORIGIN_KEY_HOST_FILE"
if (-not (Test-Path $OriginCert)) {
  throw "Cloudflare origin certificate not found: $OriginCert"
}
if (-not (Test-Path $OriginKey)) {
  throw "Cloudflare origin key not found: $OriginKey"
}
if ([string]::IsNullOrWhiteSpace($ImageTagOverride)) {
  $ImageTag = $DefaultImageTag
} else {
  $ImageTag = $ImageTagOverride
}

$env:API_IMAGE = Require-EnvValue -Path $ResolvedEnvFile -Key "API_IMAGE"
$env:WEB_IMAGE = Require-EnvValue -Path $ResolvedEnvFile -Key "WEB_IMAGE"
$env:IMAGE_TAG = $ImageTag
$env:MARIADB_DATABASE = Require-EnvValue -Path $ResolvedEnvFile -Key "MARIADB_DATABASE"
$env:MARIADB_USER = Require-EnvValue -Path $ResolvedEnvFile -Key "MARIADB_USER"
$env:MARIADB_PASSWORD = Require-EnvValue -Path $ResolvedEnvFile -Key "MARIADB_PASSWORD"
$env:APP_PUBLIC_URL = Require-EnvValue -Path $ResolvedEnvFile -Key "APP_PUBLIC_URL"
$env:JWT_SECRET = Require-EnvValue -Path $ResolvedEnvFile -Key "JWT_SECRET"
$env:RESEND_API_KEY = Require-EnvValue -Path $ResolvedEnvFile -Key "RESEND_API_KEY"
$env:RESEND_FROM = Require-EnvValue -Path $ResolvedEnvFile -Key "RESEND_FROM"
$env:CLOUDFLARE_ORIGIN_CERT_HOST_FILE = $OriginCert
$env:CLOUDFLARE_ORIGIN_KEY_HOST_FILE = $OriginKey

$env:GHCR_TOKEN | docker login ghcr.io -u $env:GHCR_USERNAME --password-stdin
Assert-LastExitCode "docker login"
docker compose @ComposeArgs pull
Assert-LastExitCode "docker compose pull"
docker compose @ComposeArgs up -d --no-build --remove-orphans
Assert-LastExitCode "docker compose up"
docker compose @ComposeArgs ps
Assert-LastExitCode "docker compose ps"

Write-Host "Deployed IMAGE_TAG=$ImageTag"
