@echo off
setlocal
set PYTHONUTF8=1
cd /d "X:\Github\atrium"
rem server.py owns hub.log and rotates it itself. This file must NOT append
rem there too: a second open handle makes Windows refuse the rename rotation
rem needs. What lands here is only what escapes logging entirely - an import
rem error, a hard crash traceback - and it is overwritten each start so it
rem cannot grow either.
rem
rem ASCII and CRLF only. cmd.exe parses .bat by byte: bare LF line endings
rem make it drop the first characters of every line ("setlocal" ran as
rem "ocal"), and a non-ASCII byte here is read in the OEM codepage, not UTF-8.
python server.py > hub.boot.log 2>&1
