@echo off
setlocal
set PYTHONUTF8=1
cd /d "X:\Github\atrium"
echo [%date% %time%] (re)start >> hub.log
python server.py >> hub.log 2>&1
