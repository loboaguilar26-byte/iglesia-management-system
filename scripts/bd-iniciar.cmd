@echo off
rem Inicia la base de datos local del proyecto (PostgreSQL 17, puerto 5433).
rem Ejecutalo despues de reiniciar la computadora:   scripts\bd-iniciar.cmd
setlocal
set "PGBIN=C:\Program Files\PostgreSQL\17\bin"
set "PGDATA=%USERPROFILE%\iglesia-pgdata"

"%PGBIN%\pg_ctl.exe" -D "%PGDATA%" status >nul 2>&1
if "%ERRORLEVEL%"=="0" (
  echo La base de datos ya esta en marcha ^(puerto 5433^).
  exit /b 0
)
"%PGBIN%\pg_ctl.exe" -D "%PGDATA%" -l "%PGDATA%\servidor.log" -o "-p 5433" -w start
