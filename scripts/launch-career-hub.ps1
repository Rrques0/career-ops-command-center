$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$url = 'http://127.0.0.1:4317'

function Get-CareerHealth {
    try { return Invoke-RestMethod -Uri "$url/api/health" -TimeoutSec 2 }
    catch { return $null }
}

function Test-CareerEngine {
    $health = Get-CareerHealth
    return $null -ne $health -and $health.service -eq 'career-ops-command'
}

function Clear-StaleCareerListener {
    $listener = Get-NetTCPConnection -LocalPort 4317 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $listener) { return }
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
    $commandLine = [string]$process.CommandLine
    if ($commandLine -match '(?i)\bbackend\.server\b.*\b--port\s+4317\b') {
        Stop-Process -Id $listener.OwningProcess -Force
        $deadline = (Get-Date).AddSeconds(4)
        while ((Get-NetTCPConnection -LocalPort 4317 -State Listen -ErrorAction SilentlyContinue) -and (Get-Date) -lt $deadline) {
            Start-Sleep -Milliseconds 150
        }
        return
    }
    $name = if ($process.Name) { $process.Name } else { "PID $($listener.OwningProcess)" }
    throw "Port 4317 is already in use by $name. Career Ops will not close another program. Close that program or change its port, then open this shortcut again."
}

try {
    if (-not (Test-CareerEngine)) {
        Clear-StaleCareerListener
        $pythonPath = (Get-Command python.exe -ErrorAction Stop).Source
        $logFolder = Join-Path $projectDirectory 'data'
        New-Item -ItemType Directory -Force -Path $logFolder | Out-Null
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
