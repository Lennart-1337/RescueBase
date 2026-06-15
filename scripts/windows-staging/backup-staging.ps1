param(
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$EnvFile = ".env.staging"
)

$ResolvedProjectDir = (Resolve-Path $ProjectDir).Path
$ResolvedEnvFile = if ([IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $ResolvedProjectDir $EnvFile }
$ComposeArgs = @("--project-directory", $ResolvedProjectDir, "--env-file", $ResolvedEnvFile, "-f", "docker-compose.yml", "-f", "docker-compose.staging.yml")

if (-not (Test-Path $ResolvedEnvFile)) {
  throw "Environment file not found: $ResolvedEnvFile"
}

docker compose @ComposeArgs up -d mariadb
docker compose --profile ops @ComposeArgs run --rm backup
