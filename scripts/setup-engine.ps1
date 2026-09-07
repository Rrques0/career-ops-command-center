$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$engineDirectory = Join-Path $projectDirectory 'career-ops'
if (Test-Path -LiteralPath $engineDirectory) { throw 'career-ops already exists. No existing engine files were changed.' }
git clone https://github.com/santifer/career-ops.git $engineDirectory
if ($LASTEXITCODE -ne 0) { throw 'Engine clone failed' }
git -C $engineDirectory checkout --detach 10a569b1e9178aa90ef8028ea287e411a831e1b6
if ($LASTEXITCODE -ne 0) { throw 'Could not select tested upstream revision' }
foreach ($file in @('career_intelligence.py','career_ops_gui.pyw','workflow_catalog.py')) {
    Copy-Item -LiteralPath (Join-Path $projectDirectory "engine-native/$file") -Destination $engineDirectory
}
npm --prefix $engineDirectory ci
if ($LASTEXITCODE -ne 0) { throw 'Engine dependency installation failed' }
New-Item -ItemType Directory -Force -Path (Join-Path $projectDirectory 'data') | Out-Null
Write-Output 'Engine installed. Configure your own profile and resume locally before using career workflows.'
