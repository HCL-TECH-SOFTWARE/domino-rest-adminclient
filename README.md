# HCL Domino REST API Admin Client

The Domino Rest Admin Client is a web UI that facilitates managing schemas, scopes, and applications using Domino Rest API. By nature, it is built on JavaScript and the React framework, but it is used in a Maven application (Domino Rest API) as a [WebJar](https://www.webjars.org/). This WebJar will be contained in Domino Rest API's Java libraries.

Once you have Domino Rest API, you can access it on http://localhost:8880/admin/ui.

Check Contributing for details on how to contribute.

## 📔 Documentation
- [Using Domino REST API Admin Client](https://opensource.hcltechsw.com/Domino-rest-api/references/usingdominorestapi/administrationui.html)
- [Contributing](/CONTRIBUTING.md)

## ⬇️ Expected Dependencies

Domino Rest Admin Client uses Maven to build the WebJar. As such, the following dependencies are needed:

| Dependency | Version |
| --- | --- |
| Java | 1.8 |
| maven-clean-plugin | 3.1.0 |
| maven-jar-plugin | 3.2.2 |
| exec-maven-plugin | 3.0.0 |

All these dependencies are listed in the pom.xml file.

`maven-jar-plugin` builds the WebJar.

Domino Rest Admin Client uses `npm` as its package manager. The `exec-maven-plugin` runs these `npm` commands when building the application.

### 🗂️ config.json

The config.json file contains the configurations for Admin UI and the paths that will be available in the WebJar.

## 🛠️ Building

To build, run the following from the main project directory:

Mac / linux

`localbuild.sh`

Windows

`localbuild.cmd`

## License

Copyright 2022-23, HCL America, Inc. under Apache License.