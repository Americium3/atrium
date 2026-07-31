# Atrium Concierge - port-guarded autostart for the local web UI fleet.
# Run at logon by the "AtriumConcierge" scheduled task (via concierge.vbs).
# For each service: if its port already answers, leave it alone; otherwise
# launch its hidden starter. Services are spawned through WMI so they are
# parented outside the scheduled task's job object -- Task Scheduler's
# execution time limit can never reap them.
#
# ASCII only: PowerShell 5.1 reads unmarked scripts as ANSI on this machine.

$services = @(
    @{ Name = 'ground-station'; Port = 8768; Launcher = 'X:\Github\pdx-mod-hub\scripts\run_hub_hidden.vbs' },
    @{ Name = 'outreach-desk';  Port = 8802; Launcher = 'X:\Github\linkedin-networking\run_server_hidden.vbs' },
    @{ Name = 'atrium-hub';     Port = 8769; Launcher = 'X:\Github\atrium\run_hub_hidden.vbs' },
    @{ Name = 'press-room';     Port = 8765; Launcher = 'X:\Github\yorha-news\scripts\run_server_hidden.vbs' }
)
# Anime Autopilot (:8767) is intentionally absent: its .lnk files already
# live in shell:startup and race a port probe at logon.
#
# The Press Room is listed as a safety net, not as its owner: the
# "YoRHaNews-Server" scheduled task starts it at logon too. The port guard
# below is what keeps the two from fighting.

$log = 'X:\Github\atrium\state\concierge.log'
New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null

function Test-Port([int]$port) {
    try {
        $c = New-Object Net.Sockets.TcpClient
        $ok = $c.ConnectAsync('127.0.0.1', $port).Wait(700)
        $c.Close()
        return $ok
    } catch { return $false }
}

# Probe, and if the port is silent give it one more look a few seconds later.
# Several services are started at logon by their own mechanism (Startup
# shortcuts, a dedicated logon task) at the same moment this script runs, and a
# cold-boot uvicorn can take longer to bind than this task's trigger delay.
# Without the second look the concierge launches a duplicate that dies on
# "address already in use" and leaves a traceback in that service's log. The
# extra wait is only ever paid on a port that is genuinely down, which is the
# launch path anyway.
function Wait-Port([int]$port) {
    if (Test-Port $port) { return $true }
    Start-Sleep -Seconds 3
    return (Test-Port $port)
}

foreach ($s in $services) {
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    if (Wait-Port $s.Port) {
        Add-Content $log "[$stamp] $($s.Name) already up on :$($s.Port)"
        continue
    }
    if (-not (Test-Path $s.Launcher)) {
        Add-Content $log "[$stamp] $($s.Name) launcher missing: $($s.Launcher)"
        continue
    }
    $cmd = 'wscript.exe "' + $s.Launcher + '"'
    $r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create `
        -Arguments @{ CommandLine = $cmd } -ErrorAction SilentlyContinue
    if ($null -ne $r -and $r.ReturnValue -eq 0) {
        Add-Content $log "[$stamp] $($s.Name) launched (pid $($r.ProcessId))"
    } else {
        Add-Content $log "[$stamp] $($s.Name) launch FAILED (rv=$(if ($r) { $r.ReturnValue } else { 'cim-error' }))"
    }
}
