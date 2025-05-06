@echo off
echo Starting Vahan Data Dashboard...
start cmd /k "cd %~dp0 && npm run server"
start cmd /k "cd %~dp0/client && npm start"
echo Both server and client have been started in separate windows. 