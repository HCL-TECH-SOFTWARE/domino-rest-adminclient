# HCL Domino REST API Admin Client

The Domino Rest Admin Client is a web UI that facilitates managing schemas, scopes, and applications using Domino Rest API. By nature, it is built on JavaScript and the React framework, but it is used in a Maven application (Domino Rest API) as a [WebJar](https://www.webjars.org/). This WebJar will be contained in Domino Rest API's Java libraries.

Once you have Domino Rest API, you can access it on http://localhost:8880/admin/ui.

Check Contributing for details on how to contribute.

## 📔 Documentation

- [Using Domino REST API Admin Client](https://opensource.hcltechsw.com/Domino-rest-api/references/usingdominorestapi/administrationui.html)
- [Contributing](/CONTRIBUTING.md)

## ⬇️ Expected Dependencies

Domino Rest Admin Client uses Maven to build the WebJar. As such, the following dependencies are needed:

| Dependency         | Version |
| ------------------ | ------- |
| Java               | 1.8     |
| maven-clean-plugin | 3.1.0   |
| maven-jar-plugin   | 3.2.2   |
| exec-maven-plugin  | 3.0.0   |

All these dependencies are listed in the pom.xml file.

`maven-jar-plugin` builds the WebJar.

Domino Rest Admin Client uses `npm` as its package manager. The `exec-maven-plugin` runs these `npm` commands when building the application.

### 🗂️ config.json

The config.json file contains the configurations for Admin UI and the paths that will be available in the WebJar.

## 🌐 Lit Web Components

Our current components are Lit 3.0 web components. To build a custom Lit element, please follow the following steps:

1. Place your Lit element file in _src/components/keep-elements_. For example, we currently have Lit element with the tag name `keep-autocomplete`, under the class name `Autocomplete`.

```javascript
import { LitElement, html, css } from 'lit';

class Autocomplete extends LitElement {
  // definition of custom lit element goes here
}

customElements.define('keep-autocomplete', Autocomplete);

export default Autocomplete;
```



### 🎨 Icons

!!! warning
Shoelace has been deprecated in favour of Lit and Web Awesome

Icons are Font Awesome glyphs served from this app, never from a CDN. Web Awesome's
built-in resolver would fetch `<wa-icon name="…">` from `ka-f.fontawesome.com` at
runtime, so `src/services/icon-library.ts` registers a `fa` library whose glyphs are
bundled from the `@fontawesome/fontawesome-free` dependency instead.

To use an icon, reference it by its Font Awesome name through that library:

```javascript
<wa-icon library="${FA_LIBRARY}" name="copy"></wa-icon>
```

`KeepButton` takes the name directly:

```jsx
<keep=button icon="plus" @click=${handleAdd}>Add</keep-button>
```

Only the glyphs listed in `ICONS` are bundled — to add one, import its URL in
`icon-library.ts` and add it to that map. An unregistered name logs a warning and
renders an empty glyph, and `test/services/icon-library.test.ts` fails the build for
any name used in markup that isn't bundled.

Don't reference icons by URL (`<wa-icon src="${IMG_DIR}/…">`): that hardcodes `/admin/`
and renders blank wherever the app isn't mounted there. Data URIs are fine — the
app-specific icons in `styles/app-icons.ts` are inlined that way.

## 🛠️ Building

To build, run the following from the main project directory:

### Mac / Linux

`localbuild.sh`

### Windows

`localbuild.cmd`

## License

Copyright 2022, 2026, HCL America, Inc. under Apache 2.0 License.
