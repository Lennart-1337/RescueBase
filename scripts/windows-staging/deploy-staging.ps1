param(
  [string]$DistroName = "Ubuntu-24.04",
  [string]$ProjectDir = "/opt/rescuebase/staging",
  [string]$Branch = "staging",
  [string]$EnvFile = ".env.staging",
  [string]$ImageTag = ""
)

if (-not $env:GHCR_USERNAME) {
  throw "GHCR_USERNAME environment variable is required."
}
if (-not $env:GHCR_TOKEN) {
  throw "GHCR_TOKEN environment variable is required."
}

$deployCommand = @"
set -eu
export PROJECT_DIR='$ProjectDir'
export BRANCH='$Branch'
export ENV_FILE='$EnvFile'
export GHCR_USERNAME='${env:GHCR_USERNAME}'
export GHCR_TOKEN='${env:GHCR_TOKEN}'
export IMAGE_TAG_OVERRIDE='$ImageTag'
bash '$ProjectDir/scripts/staging/deploy.sh'
"@

wsl.exe -d $DistroName -- bash -lc $deployCommand
