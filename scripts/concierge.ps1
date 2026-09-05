# Atrium Concierge - health-guarded keepalive for the local web UI fleet.
#
# Run at logon AND every few minutes by the "AtriumConcierge" scheduled task
# (via concierge.vbs). One script serves both roles: the logic is the same
# either way -- probe, and repair whatever is not answering.
#
# Two failure modes are handled differently, because they carry different risk:
#
#   port silent    -> just launch the service. No side effects, so no waiting.
#   port answering
#   but HTTP sick  -> a wedged process is holding the port. Killing is
#                     destructive and a false positive would take down a
#                     healthy service every cycle, so this path is rate limited
#                     and requires the failure to persist across cycles.
#
# Services are spawned through WMI so they are parented outside the scheduled
# task's job object -- Task Scheduler's execution time limit can never reap
# them.
#
# ASCII only: PowerShell 5.1 reads unmarked scripts as ANSI on this machine.

# Health endpoints are the real thing, not a bare TCP connect: a wedged uvicorn
# keeps the listening socket open long after it stops serving. Headers matter --
# Ground Station rejects every request without X-PMH and would otherwise look
# permanently sick and be killed on a loop.
$services = @(
    @{ Name = 'ground-station'; Port = 8768; Path = '/api/ping';   Headers = @{ 'X-PMH' = '1' }
       Launcher = 'X:\Github\pdx-mod-hub\scripts\run_hub_hidden.vbs' },
    @{ Name = 'outreach-desk';  Port = 8802; Path = '/api/ping';   Headers = @{}
       Launcher = 'X:\Github\linkedin-networking\run_server_hidden.vbs' },
    @{ Name = 'atrium-hub';     Port = 8769; Path = '/';           Headers = @{}
       Launcher = 'X:\Github\atrium\run_hub_hidden.vbs' },
    @{ Name = 'press-room';     Port = 8765; Path = '/api/status'; Headers = @{}
       Launcher = 'X:\Github\yorha-news\scripts\run_server_hidden.vbs' },
    @{ Name = 'anime-autopilot'; Port = 8767; Path = '/';          Headers = @{}
       Launcher = 'X:\Github\anime-rss-auto\run_webui_hidden.vbs' },
    @{ Name = 'arsenal';        Port = 8770; Path = '/api/status'; Headers = @{}
       Launcher = 'X:\Github\arsenal\run_server_hidden.vbs' },
    @{ Name = 'bourse';         Port = 8771; Path = '/api/status'; Headers = @{}
       Launcher = 'X:\Github\bourse\run_server_hidden.vbs' }
)
# Anime Autopilot also has .lnk files in shell:startup, and the Press Room has
# its own "YoRHaNews-Server" logon task. Both are listed here as a safety net,
# not as their owner -- the port guard below is what keeps them from fighting.
# Before this script ran periodically, whichever of them died mid-session
# stayed dead until the next logon; that is the gap this file exists to close.

# Only ever kill something that looks like one of our servers. A port number
# can be reused by anything after a reboot, and this script runs unattended.
$killableNames = @('python', 'python3.11', 'pythonw', 'node', 'wscript', 'cmd')

# A wedged service must fail this many consecutive cycles before it is killed.
# One bad cycle is not evidence: a service can be mid-restart, or the box can be
# briefly starved. Two cycles at the 5 min repeat means ~5-10 min of real
# sickness before anything destructive happens.
$sickCyclesBeforeKill = 2

# Never intervene on the same service more than this often, and never more than
# this many times per hour. A service that crashes on startup would otherwise
# be relaunched forever, which is worse than staying down.
$cooldownMinutes = 10
$maxRepairsPerHour = 3

$log   = 'X:\Github\atrium\state\concierge.log'
$state = 'X:\Github\atrium\state\concierge-state.json'
New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null

# Keep the log readable by hand: this script now runs ~288 times a day, so a
# healthy fleet must be silent. Only transitions and repairs are written.
function Write-Log([string]$msg) {
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content $log "[$stamp] $msg"
}

if (Test-Path $log) {
    $logItem = Get-Item $log
    if ($logItem.Length -gt 1MB) {
        Move-Item $log "$log.1" -Force
    }
}

# Persisted across runs: consecutive sick cycles, and repair history for the
# rate limit. Without this the "must fail twice" rule cannot work, since each
# scheduled run is a fresh process.
$st = @{}
if (Test-Path $state) {
    try {
        $raw = Get-Content $state -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($p in $raw.PSObject.Properties) {
            $st[$p.Name] = @{
                Sick    = [int]$p.Value.Sick
                Repairs = @($p.Value.Repairs | Where-Object { $_ })
            }
        }
    } catch {
        Write-Log "state file unreadable, starting fresh: $($_.Exception.Message)"
    }
}

function Get-Entry([string]$name) {
    if (-not $st.ContainsKey($name)) { $st[$name] = @{ Sick = 0; Repairs = @() } }
    return $st[$name]
}

function Test-PortOpen([int]$port) {
    try {
        $c = New-Object Net.Sockets.TcpClient
        $ok = $c.ConnectAsync('127.0.0.1', $port).Wait(700)
        $c.Close()
        return $ok
    } catch { return $false }
}

# 127.0.0.1, never "localhost": resolving localhost on this box tries ::1 first
# and eats a ~2s timeout per request before falling back to IPv4.
function Test-Healthy($svc) {
    $uri = "http://127.0.0.1:$($svc.Port)$($svc.Path)"
    try {
        $r = Invoke-WebRequest -Uri $uri -TimeoutSec 5 -UseBasicParsing `
                               -Headers $svc.Headers -ErrorAction Stop
        return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400)
    } catch {
        return $false
    }
}

# Kill by PID off the listening socket, not by process name: the Microsoft
# Store Python launcher runs these servers as python3.11.exe, so a name filter
# misses them and the relaunch dies on "address already in use" while the wedged
# original keeps answering.
function Stop-PortHolder([int]$port, [string]$name) {
    $killed = $false
    $conns = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
    foreach ($c in $conns) {
        $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
        if ($null -eq $p) { continue }
        if ($killableNames -notcontains $p.ProcessName) {
            Write-Log "$name REFUSING to kill pid $($p.Id) ($($p.ProcessName)) on :$port - not a known server process"
            continue
        }
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        Write-Log "$name killed wedged pid $($p.Id) ($($p.ProcessName)) on :$port"
        $killed = $true
    }
    return $killed
}

function Start-Service-Detached($svc) {
    if (-not (Test-Path $svc.Launcher)) {
        Write-Log "$($svc.Name) launcher missing: $($svc.Launcher)"
        return $false
    }
    $cmd = 'wscript.exe "' + $svc.Launcher + '"'
    $r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create `
        -Arguments @{ CommandLine = $cmd } -ErrorAction SilentlyContinue
    if ($null -ne $r -and $r.ReturnValue -eq 0) {
        Write-Log "$($svc.Name) launched (pid $($r.ProcessId))"
        return $true
    }
    Write-Log "$($svc.Name) launch FAILED (rv=$(if ($r) { $r.ReturnValue } else { 'cim-error' }))"
    return $false
}

# Returns $true if this service is allowed to be repaired right now.
function Test-RepairAllowed($entry, [string]$name) {
    $now = Get-Date
    $recent = @($entry.Repairs | Where-Object {
        $_ -and ([datetime]$_) -gt $now.AddHours(-1)
    })
    $entry.Repairs = $recent
    if ($recent.Count -ge $maxRepairsPerHour) {
        Write-Log "$name giving up: $($recent.Count) repairs in the last hour, needs a human"
        return $false
    }
    $last = $recent | Sort-Object -Descending | Select-Object -First 1
    if ($last -and ([datetime]$last) -gt $now.AddMinutes(-$cooldownMinutes)) {
        return $false
    }
    return $true
}

foreach ($s in $services) {
    $entry = Get-Entry $s.Name
    $portOpen = Test-PortOpen $s.Port

    if ($portOpen -and (Test-Healthy $s)) {
        if ($entry.Sick -gt 0) { Write-Log "$($s.Name) recovered on :$($s.Port)" }
        $entry.Sick = 0
        continue
    }

    # Down and quiet: launching is harmless, so skip the cooldown-free path only
    # for the rate limit (a service that will not stay up must not be hammered).
    if (-not $portOpen) {
        $entry.Sick = 0
        if (Test-RepairAllowed $entry $s.Name) {
            Write-Log "$($s.Name) down on :$($s.Port) - launching"
            if (Start-Service-Detached $s) {
                $entry.Repairs = @($entry.Repairs) + @((Get-Date).ToString('o'))
            }
        }
        continue
    }

    # Port answers TCP but the service does not serve. This is the destructive
    # branch, so require persistence before acting.
    $entry.Sick = [int]$entry.Sick + 1
    if ($entry.Sick -lt $sickCyclesBeforeKill) {
        Write-Log "$($s.Name) not healthy on :$($s.Port) (strike $($entry.Sick)/$sickCyclesBeforeKill)"
        continue
    }
    if (-not (Test-RepairAllowed $entry $s.Name)) { continue }

    Write-Log "$($s.Name) wedged on :$($s.Port) after $($entry.Sick) cycles - restarting"
    if (Stop-PortHolder $s.Port $s.Name) {
        Start-Sleep -Seconds 2
        if (Start-Service-Detached $s) {
            $entry.Repairs = @($entry.Repairs) + @((Get-Date).ToString('o'))
        }
        $entry.Sick = 0
    }
}

$st | ConvertTo-Json -Depth 5 | Set-Content $state -Encoding UTF8
