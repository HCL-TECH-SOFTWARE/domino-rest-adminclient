REM Locally build the AdminUI JAR on Windows
mvn clean
npm config list
npm ci
npm run build:win
npm run test
mvn install