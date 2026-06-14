param(
  [Parameter(Mandatory = $true)][string]$BackupFile,
  [string]$DistroName = "Ubuntu-24.04",
  [string]$ProjectDir = "/opt/rescuebase/staging",
  [string]$EnvFile = ".env.staging"
)

$restoreCommand = @"
set -eu
export PROJECT_DIR='$ProjectDir'
export ENV_FILE='$EnvFile'
export BACKUP_FILE='$BackupFile'
bash '$ProjectDir/scripts/staging/restore.sh'
"@

wsl.exe -d $DistroName -- bash -lc $restoreCommand
