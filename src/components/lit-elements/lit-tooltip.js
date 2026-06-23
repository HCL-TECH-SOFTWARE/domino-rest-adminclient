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
        withoutArrow: { type: Boolean, attribute: 'without-arrow' },
    }

    constructor() {
        super()
        this.content = ''
        this.placement = 'top'
        this.withoutArrow = false
        this._popup = null
        this._arrow = null
        this._visible = false
        this._showBound = this._showPopup.bind(this)
        this._hideBound = this._hidePopup.bind(this)
    }

    _findContainer() {
        // Walk up the composed path to find the nearest <dialog> ancestor.
        // showModal() promotes <dialog> to the top layer; any popup appended
        // to document.body would render *below* it. Appending inside the
        // dialog keeps the popup in the same top-layer context.
        let node = this.parentNode
        while (node) {
            if (node instanceof HTMLDialogElement) return node
            node = node.parentNode || (node instanceof ShadowRoot ? node.host : null)
        }
        return document.body
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
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            textAlign: 'center',
            maxWidth: '480px',
            width: 'max-content',
            display: 'none',
        })

        this._arrow = document.createElement('div')
        Object.assign(this._arrow.style, {
            position: 'fixed',
            zIndex: '9998',
            width: '0',
            height: '0',
            pointerEvents: 'none',
            display: 'none',
        })

        // Append to nearest <dialog> ancestor (if any) so the popup sits in
        // the same top-layer context as a showModal() dialog. Falls back to
        // document.body for normal page use.
        const container = this._findContainer()
        container.appendChild(this._popup)
        container.appendChild(this._arrow)
        this.addEventListener('mouseenter', this._showBound)
        this.addEventListener('mouseleave', this._hideBound)
        this.addEventListener('focus', this._showBound, true)
        this.addEventListener('blur', this._hideBound, true)
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._popup?.remove()
        this._arrow?.remove()
        this._popup = null
        this._arrow = null
        this._visible = false
        this.removeEventListener('mouseenter', this._showBound)
        this.removeEventListener('mouseleave', this._hideBound)
        this.removeEventListener('focus', this._showBound, true)
        this.removeEventListener('blur', this._hideBound, true)
    }

    updated(changed) {
        // If content changes while the tooltip is open, update it live
        if (changed.has('content') && this._visible && this._popup) {
            this._popup.textContent = this.content
            this._position()
        }
    }

    _showPopup() {
        if (!this._popup || !this.content) return
        this._visible = true
        this._popup.textContent = this.content

        // Adapt background to current theme
        const isDark = document.body.getAttribute('data-theme') === 'dark'
        const bg = isDark ? '#4a4a4a' : 'var(--wa-color-neutral-950, #18191b)'
        this._popup.style.background = bg
        if (this._arrow) this._arrowBg = bg

        this._popup.style.display = 'block'
        if (!this.withoutArrow) this._arrow.style.display = 'block'
        this._position()
    }

    _hidePopup() {
        this._visible = false
        if (this._popup) this._popup.style.display = 'none'
        if (this._arrow) this._arrow.style.display = 'none'
    }

    _position() {
        // Use the first slotted child's rect for centering so the arrow points
        // to the actual trigger element, not the (potentially wider) host.
        const slot = this.shadowRoot?.querySelector('slot')
        const assigned = slot?.assignedElements() ?? []
        const anchorEl = assigned[0] ?? this
        const rect = anchorEl.getBoundingClientRect()
        const pop = this._popup
        const arrow = this._arrow
        const gap = 6
        const arrowSize = 6

        pop.style.visibility = 'hidden'
        const pw = pop.offsetWidth
        const ph = pop.offsetHeight
        pop.style.visibility = ''

        const bg = this._arrowBg || 'var(--wa-color-neutral-950, #18191b)'
        let popTop, popLeft, arrowTop, arrowLeft, arrowBorder

        switch (this.placement) {
            case 'bottom':
                popTop  = rect.bottom + gap + arrowSize
                popLeft = rect.left + rect.width / 2 - pw / 2
                arrowTop  = rect.bottom + gap
                arrowLeft = rect.left + rect.width / 2 - arrowSize
                arrowBorder = `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`
                arrow.style.borderColor = `transparent transparent ${bg} transparent`
                break
            case 'left':
                popTop  = rect.top + rect.height / 2 - ph / 2
                popLeft = rect.left - pw - gap - arrowSize
                arrowTop  = rect.top + rect.height / 2 - arrowSize
                arrowLeft = rect.left - gap - arrowSize * 2
                arrowBorder = `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`
                arrow.style.borderColor = `transparent transparent transparent ${bg}`
                break
            case 'right':
                popTop  = rect.top + rect.height / 2 - ph / 2
                popLeft = rect.right + gap + arrowSize
                arrowTop  = rect.top + rect.height / 2 - arrowSize
                arrowLeft = rect.right + gap
                arrowBorder = `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`
                arrow.style.borderColor = `transparent ${bg} transparent transparent`
                break
            case 'top':
            default:
                popTop  = rect.top - ph - gap - arrowSize
                popLeft = rect.left + rect.width / 2 - pw / 2
                arrowTop  = rect.top - gap - arrowSize
                arrowLeft = rect.left + rect.width / 2 - arrowSize
                arrowBorder = `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`
                arrow.style.borderColor = `${bg} transparent transparent transparent`
        }

        pop.style.top  = `${Math.max(4, popTop)}px`
        pop.style.left = `${Math.max(4, popLeft)}px`

        arrow.style.borderWidth = arrowBorder
        arrow.style.borderStyle = 'solid'
        arrow.style.top  = `${arrowTop}px`
        arrow.style.left = `${arrowLeft}px`
    }

    render() {
        return html`<slot></slot>`
    }
}

customElements.define('lit-tooltip', Tooltip)

export default Tooltip

