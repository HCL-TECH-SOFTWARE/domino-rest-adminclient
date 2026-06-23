import { LitElement, html, css } from 'lit';

class Tooltip extends LitElement {

    static styles = css`
        :host {
            display: inline-block;
        }
    `

    static properties = {
        content: { type: String },
        placement: { type: String },
    }

    constructor() {
        super()
        this.content = ''
        this.placement = 'top'
        this._popup = null
        this._showBound = this._showPopup.bind(this)
        this._hideBound = this._hidePopup.bind(this)
    }

    connectedCallback() {
        super.connectedCallback()
        this._popup = document.createElement('div')
        this._popup.setAttribute('role', 'tooltip')
        Object.assign(this._popup.style, {
            position: 'fixed',
            zIndex: '9999',
            background: 'var(--wa-color-neutral-950, #18191b)',
            color: 'var(--wa-color-neutral-0, #ffffff)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: 'var(--wa-font-size-small, 12px)',
            fontFamily: 'var(--wa-font-sans, inherit)',
            lineHeight: '1.4',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            maxWidth: '240px',
            display: 'none',
        })
        document.body.appendChild(this._popup)
        this.addEventListener('mouseenter', this._showBound)
        this.addEventListener('mouseleave', this._hideBound)
        this.addEventListener('focus', this._showBound, true)
        this.addEventListener('blur', this._hideBound, true)
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._popup?.remove()
        this._popup = null
        this.removeEventListener('mouseenter', this._showBound)
        this.removeEventListener('mouseleave', this._hideBound)
        this.removeEventListener('focus', this._showBound, true)
        this.removeEventListener('blur', this._hideBound, true)
    }

    _showPopup() {
        if (!this._popup || !this.content) return
        this._popup.textContent = this.content
        this._popup.style.display = 'block'
        this._position()
    }

    _hidePopup() {
        if (this._popup) this._popup.style.display = 'none'
    }

    _position() {
        const rect = this.getBoundingClientRect()
        const pop = this._popup
        // Measure off-screen first
        pop.style.visibility = 'hidden'
        const pw = pop.offsetWidth
        const ph = pop.offsetHeight
        pop.style.visibility = ''
        const gap = 8
        let top, left
        switch (this.placement) {
            case 'bottom':
                top = rect.bottom + gap
                left = rect.left + rect.width / 2 - pw / 2
                break
            case 'left':
                top = rect.top + rect.height / 2 - ph / 2
                left = rect.left - pw - gap
                break
            case 'right':
                top = rect.top + rect.height / 2 - ph / 2
                left = rect.right + gap
                break
            case 'top':
            default:
                top = rect.top - ph - gap
                left = rect.left + rect.width / 2 - pw / 2
        }
        pop.style.top = `${Math.max(4, top)}px`
        pop.style.left = `${Math.max(4, left)}px`
    }

    render() {
        return html`<slot></slot>`
    }
}

customElements.define('lit-tooltip', Tooltip)

export default Tooltip
