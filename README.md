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

## 🌐 Lit Web Components

We are now in the process of slowly migrating our current components to Lit 3.0 web components. To build a custom Lit element, please follow the following steps:

1. Place your Lit element file in *src/components/lit-elements*. For example, we currently have Lit element with the tag name `lit-autocomplete`, under the class name `Autocomplete`.
```javascript
import { LitElement, html, css } from 'lit';

class Autocomplete extends LitElement {
    // definition of custom lit element goes here
}

customElements.define('lit-autocomplete', Autocomplete)

export default Autocomplete
```
2. Add your Lit element's React counterpart in *src/components/lit-elements/LitElements.tsx* using the `createComponent` method (see [documentation](https://lit.dev/docs/frameworks/react/#createcomponent) for details). For example:
```typescript
export const LitAutocomplete = createComponent({
  tagName: 'lit-autocomplete',
  elementClass: Autocomplete,
  react: React,
});
```
3. From here, you will be able to import the Lit element in a component as another React component:
```javascript
import { LitAutocomplete } from '../lit-elements/LitElements'
```

### 🗝️ Accessing Values
To access the Lit element's properties, create a reference using React's `useRef` hook and pass it onto the Lit element as a prop.

```javascript
const autocompleteRef = useRef<any>(null)
<LitAutocomplete
    ...options
    ref={autocompleteRef}
/>
```

The properties are accessible through the Lit element's shadow root.

```javascript
autocompleteRef.current.shadowRoot.querySelector('input')
```

### 👠 Shoelace

As part of our move to web components, we are also using Shoelace, which is built under Lit, for more standard web components. Shoelace has an icon and an icon button; however, we couldn't use import the icons through reference, so we include them in the `IMG_DIR` (check config.dev).

To use icons with Shoelace, add your icon SVG or PNG to the `IMG_DIR`, and reference that path in the `src` attribute of the Shoelace element. For example:
```javascript
<sl-icon src="${IMG_DIR}/shoelace/copy.svg"></sl-icon>
```
See the [Shoelace documentation](https://shoelace.style/components/icon/#custom-icons) for more details on custom icons.

## 🛠️ Building

To build, run the following from the main project directory:

### Mac / Linux

`localbuild.sh`

### Windows

`localbuild.cmd`

## License

Copyright 2022-25, HCL America, Inc. under Apache License.