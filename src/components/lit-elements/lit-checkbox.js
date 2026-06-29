import { LitElement, html, css } from 'lit';
// Import Shoelace theme (light/dark)
import '@awesome.me/webawesome/dist/styles/webawesome.css';
// Import Shoelace components
import '@awesome.me/webawesome/dist/components/checkbox/checkbox.js';

class Checkbox extends LitElement {
    static styles = css`
        :host(:not([checked])) wa-checkbox::part(control) {
            background-color: transparent !important;
        }
    `

    static properties = {
        checked: { type: Boolean, reflect: true },
        disabled: { type: Boolean },
        size: { type: String },
    }

    constructor() {
        super()
        this.checked = false
        this.disabled = false
        this.size = 's'
        this._waCheckbox = null
        this._boundOnChange = this._onInnerChange.bind(this)
    }

    firstUpdated() {
        this._waCheckbox = this.shadowRoot.querySelector('wa-checkbox')
        if (this._waCheckbox) {
            this._waCheckbox.addEventListener('wa-change', this._boundOnChange)
            this._waCheckbox.addEventListener('change', this._boundOnChange)
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        if (this._waCheckbox) {
            this._waCheckbox.removeEventListener('wa-change', this._boundOnChange)
            this._waCheckbox.removeEventListener('change', this._boundOnChange)
        }
    }

    _onInnerChange() {
        const newChecked = this._waCheckbox?.checked ?? !this.checked
        if (this.checked === newChecked) return
        this.checked = newChecked
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }

    render() {
        return html`
            <wa-checkbox
                ?checked=${this.checked}
                ?disabled=${this.disabled}
                size=${this.size}
            ></wa-checkbox>
        `
    }
}

customElements.define('lit-checkbox', Checkbox);

export default Checkbox