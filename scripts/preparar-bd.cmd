@echo off
rem Prepara la base de datos local (PostgreSQL 17) segun DATABASE_URL de .env, aplica las
rem migraciones y, si se pasan argumentos, crea o repara un administrador:
rem
rem   scripts\preparar-bd.cmd correo contrasena "Nombre"
rem
rem Pide una sola vez la contrasena del usuario "postgres" (la que se eligio al instalar PostgreSQL).
setlocal
cd /d "%~dp0.."
set "PSQL=C:\Program Files\PostgreSQL\17\bin\psql.exe"
set "SQLFILE=%TEMP%\iglesia-bd-%RANDOM%.sql"

node scripts\sql-bd-local.mjs > "%SQLFILE%" || goto :error
echo Escribe la contrasena del usuario postgres:
"%PSQL%" -U postgres -h localhost -d postgres -v ON_ERROR_STOP=1 -q -f "%SQLFILE%"
set "RESULT=%ERRORLEVEL%"
del "%SQLFILE%" >nul 2>&1
if not "%RESULT%"=="0" goto :error

call pnpm db:deploy || goto :error
if not "%~1"=="" call pnpm admin %* || goto :error
echo.
echo Listo. Abre http://localhost:3000/login
exit /b 0

:error
del "%SQLFILE%" >nul 2>&1
echo.
echo Algo fallo. Revisa el mensaje de arriba.
exit /b 1
