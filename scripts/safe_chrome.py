"""A headless Chrome profile that will not lock the owner out of Windows.

Every Chromium started on a fresh profile probes the Windows account with a
blank password (an interactive LogonUser call) to learn whether the OS
password is empty, and caches the answer in the profile's "Local State" as
password_manager.os_password_blank / os_password_last_changed. A throwaway
profile has no cache, so every headless launch cost one failed logon. With
Windows 11's default lockout policy (10 failures inside 10 minutes) a batch
of parallel screenshots locked the account three times in one afternoon
(2026-09-22; the Security log showed 39 x event 4625 from chrome.exe, logon
type 2, status 0xC000006A, and 3 x event 4740).

Chrome skips the probe when (now minus the password's age) is at or before
the cached os_password_last_changed (CheckBlankPasswordWithPrefs in
chrome/browser/password_manager/password_manager_util_win.cc), so profile()
writes the current time there before the browser ever sees the directory: no
password can have been changed after the moment it was seeded. Seeding with
Chrome's own now-minus-age is not enough; that value jitters by up to a
second between calls, and half the launches probed anyway.
It also refuses to hand out a profile at all while the account already has
bad password attempts on the clock: if something is probing the password,
the right move is to stop launching browsers, not to launch the eleventh.

Usage:
    from safe_chrome import profile
    args = [CHROME, "--headless=new", "--user-data-dir=" + profile("atr-shot-"), url]
"""
import json
import os
import subprocess
import tempfile
import time

EPOCH_DELTA_US = 11644473600 * 1_000_000   # 1601-01-01 -> 1970-01-01
USER = os.environ.get("USERNAME", "")
MAX_BAD = 3


def _account():
    ps = ("$u=[ADSI]'WinNT://./%s,user'; '' + $u.InvokeGet('PasswordAge') + ' ' + "
          "$u.InvokeGet('BadPasswordAttempts') + ' ' + $u.InvokeGet('IsAccountLocked')"
          % USER.replace("'", "''"))
    out = subprocess.run(["powershell.exe", "-NoProfile", "-Command", ps],
                         capture_output=True, text=True, timeout=30).stdout.split()
    return int(out[0]), int(out[1]), out[2] == "True"


def profile(prefix="atr-chrome-"):
    """A fresh temp profile Chrome will not probe the OS password from."""
    _age, bad, locked = _account()
    if locked or bad >= MAX_BAD:
        raise SystemExit(
            "refusing to launch Chrome: the Windows account has %d bad password "
            "attempts (locked=%s). Something is probing the password; stop and "
            "look before starting another browser." % (bad, locked))
    last_changed = int(time.time() * 1_000_000) + EPOCH_DELTA_US
    d = tempfile.mkdtemp(prefix=prefix)
    with open(os.path.join(d, "Local State"), "w", encoding="utf-8") as f:
        json.dump({"password_manager": {
            "os_password_blank": False,
            "os_password_last_changed": str(last_changed),
        }}, f)
    return d
