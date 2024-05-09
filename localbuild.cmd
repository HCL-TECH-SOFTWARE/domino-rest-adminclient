REM Locally build the AdminUI JAR on Windows
@ECHO OFF
call mvn clean
call npm config list
call npm ci
call npm run build:win
call npm run test
call mvn install