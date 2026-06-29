import { LitElement, html, css } from 'lit';
// Import Shoelace theme (light/dark)
import '@awesome.me/webawesome/dist/styles/webawesome.css';
// Import Shoelace components
import '@awesome.me/webawesome/dist/components/checkbox/checkbox.js';

class Checkbox extends LitElement {
    static styles = css``

    static properties = {
        checked: { type: Boolean },
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
        if (!this._waCheckbox) return
        this._waCheckbox.addEventListener('wa-change', this._boundOnChange)
        this._waCheckbox.addEventListener('change', this._boundOnChange)
        this._waCheckbox.updateComplete.then(() => this._syncControlBackground(this.checked))
    }

    updated(changedProperties) {
        if (changedProperties.has('checked') && this._waCheckbox) {
            // Explicitly set the property (not just the attribute via ?checked binding)
            // so wa-checkbox updates its internal state reliably.
            this._waCheckbox.checked = this.checked
            const sync = () => this._syncControlBackground(this.checked)
            if (this._waCheckbox.updateComplete) {
                this._waCheckbox.updateComplete.then(sync)
            } else {
                requestAnimationFrame(sync)
            }
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        if (this._waCheckbox) {
            this._waCheckbox.removeEventListener('wa-change', this._boundOnChange)
            this._waCheckbox.removeEventListener('change', this._boundOnChange)
        }
    }

    _syncControlBackground(isChecked) {
        const sr = this._waCheckbox?.shadowRoot
        if (!sr) return
        const control = sr.querySelector('[part~="control"]') || sr.querySelector('[part~="base"]') || sr.querySelector('span')
        if (!control) return
        control.style.backgroundColor = isChecked ? '' : 'transparent'
    }

    _onInnerChange() {
        const newChecked = this._waCheckbox?.checked ?? !this.checked
        if (this.checked === newChecked) return
        this.checked = newChecked
        this._syncControlBackground(newChecked)
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