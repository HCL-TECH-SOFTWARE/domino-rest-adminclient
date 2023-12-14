#!/bin/bash
# Locally build the AdminUI JAR
mvn clean
npm config list
npm ci
npm run build
npm run test
mvn install