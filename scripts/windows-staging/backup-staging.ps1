param(
  [string]$DistroName = "Ubuntu-24.04",
  [string]$ProjectDir = "/opt/rescuebase/staging",
  [string]$EnvFile = ".env.staging"
)

$backupCommand = @"
set -eu
export PROJECT_DIR='$ProjectDir'
export ENV_FILE='$EnvFile'
bash '$ProjectDir/scripts/staging/backup.sh'
"@

wsl.exe -d $DistroName -- bash -lc $backupCommand
