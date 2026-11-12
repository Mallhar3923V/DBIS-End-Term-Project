@echo off
set MYSQL_BIN="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

if not exist %MYSQL_BIN% (
    echo [ERROR] MySQL client not found at %MYSQL_BIN%
    echo Please ensure MySQL Server 8.0 is installed in C:\Program Files\MySQL\MySQL Server 8.0
    pause
    exit /b 1
)

echo ========================================================
echo  PriceSense DBMS - Direct SQL Loader (MySQL 8.0)
echo ========================================================
echo.
set /p MYSQL_USER=Enter MySQL Username [default: root]: 
if "%MYSQL_USER%"=="" set MYSQL_USER=root

echo.
echo Step 1/3: Loading 01_schema.sql...
%MYSQL_BIN% -u %MYSQL_USER% -p < "%~dp001_schema.sql"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to load 01_schema.sql
    pause
    exit /b 1
)

echo Step 2/3: Loading 02_triggers_views_procedures.sql...
%MYSQL_BIN% -u %MYSQL_USER% -p < "%~dp002_triggers_views_procedures.sql"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to load 02_triggers_views_procedures.sql
    pause
    exit /b 1
)

echo Step 3/3: Loading 03_seed_data.sql...
%MYSQL_BIN% -u %MYSQL_USER% -p < "%~dp003_seed_data.sql"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to load 03_seed_data.sql
    pause
    exit /b 1
)

echo.
echo ========================================================
echo  Database initialized and seeded successfully!
echo ========================================================
pause
