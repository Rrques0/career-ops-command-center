$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$url = 'http://127.0.0.1:4317'
function Test-CareerEngine {
    try { return (Invoke-RestMethod -Uri "$url/api/health" -TimeoutSec 2).service -eq 'career-ops-command' }
    catch { return $false }
}
try {
    if (-not (Test-CareerEngine)) {
        $pythonPath = (Get-Command python.exe -ErrorAction Stop).Source
        $logFolder = Join-Path $projectDirectory 'data'
        Start-Process -FilePath $pythonPath -ArgumentList @('-m', 'backend.server', '--port', '4317') -WorkingDirectory $projectDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logFolder 'command-server.log') -RedirectStandardError (Join-Path $logFolder 'command-server-error.log')
        $deadline = (Get-Date).AddSeconds(20)
        while (-not (Test-CareerEngine)) {
            if ((Get-Date) -gt $deadline) { throw 'Python engine did not start. See data/command-server-error.log in the project folder.' }
            Start-Sleep -Milliseconds 250
        }
    }
    Start-Process $url
} catch {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($_.Exception.Message, 'Career Ops startup') | Out-Null
    exit 1
}
