param(
  [Parameter(Mandatory = $true)][string]$RepositoryUrl,
  [string]$DistroName = "Ubuntu-24.04",
  [string]$ProjectDir = "/opt/rescuebase/staging",
  [string]$Branch = "staging"
)

$bootstrap = @"
set -eu
export DEBIAN_FRONTEND=noninteractive
cat >/etc/wsl.conf <<'EOF'
[boot]
systemd=true
EOF
"@

$install = @"
set -eu
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \$VERSION_CODENAME stable" >/etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
mkdir -p "$(dirname "$ProjectDir")"
if [ ! -d "$ProjectDir/.git" ]; then
  git clone --branch "$Branch" "$RepositoryUrl" "$ProjectDir"
fi
mkdir -p "$ProjectDir/backups"
"@

wsl.exe --set-default-version 2 | Out-Null
wsl.exe --install --distribution $DistroName --no-launch
wsl.exe -d $DistroName -u root -- bash -lc $bootstrap
wsl.exe --shutdown
wsl.exe -d $DistroName -u root -- bash -lc $install

Write-Host "WSL staging bootstrap completed for $DistroName at $ProjectDir"
