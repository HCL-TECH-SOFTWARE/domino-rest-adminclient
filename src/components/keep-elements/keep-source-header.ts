/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './keep-source';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import { KeepElement } from './keep-element';
import { FA_LIBRARY } from '../../services/icon-library';

type TreeEl = HTMLElement & { editedContent: unknown };

/**
 * The views backed by the Monaco editor rather than the JSON tree. They share one
 * buffer, so switching between them preserves edits.
 */
export const TEXTUAL_VIEWS = ['text', 'diff'] as const;

/** True for the views that read and write the shared Monaco buffer. */
export function isTextualView(option: string): boolean {
  return (TEXTUAL_VIEWS as readonly string[]).includes(option);
}

/**
 * Source editor chrome: a Tree/Text view switcher plus copy/download/cancel/save
 * actions, wrapping the `keep-source-tree` editor. Tag: `keep-source` (note: the
 * file is `keep-source-header` but the registered tag is `keep-source`).
 */
@customElement('keep-source')
export default class SourceContents extends KeepElement {
  static styles = css`
    select {
        border: none;
        background-color: light-dark(#D7EBFD, #3a3a5a);
        color: var(--wa-color-text-normal);
        padding: 5px;
        font-size: 15px;

        &:hover {
            cursor: pointer;
        }
    }

    textarea {
        width: 100%;
        height: 60vh;
        background-color: var(--wa-color-surface-default);
        color: var(--wa-color-text-normal);
        resize: none;
    }

    header {
        background-color: light-dark(#D7EBFD, #3a3a5a);
        border-top: 1px solid var(--wa-color-surface-border);
        border-left: 1px solid var(--wa-color-surface-border);
        border-right: 1px solid var(--wa-color-surface-border);
        color: var(--wa-color-text-normal);
        padding: 5px 15px 5px 10px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }

    section {
        color: light-dark(#4a90e2, #8CC7F9);
    }
    section.buttons-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 40px;
    }

    main {
        max-width: 100%;
        max-height: 60vh;
    }

    section.button-group {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 13px;
    }

    section.view-switcher {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 10px;
    }

    /* Names which side is which, so the diff isn't ambiguous at a glance. */
    .diff-hint {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: var(--wa-font-size-m);
        color: var(--wa-color-text-quiet);
    }

    /* Plain wa-buttons acting as icon buttons: keep the icon's own colour and drop
       the default text-button padding so the header keeps its original density. */
    wa-button {
        --wa-form-control-padding-inline: 0.4em;
        color: var(--wa-color-text-normal);
    }
    wa-button.cancel {
        color: #ED0000;
    }
    wa-button.save {
        color: #007E0D;
    }
  `;

  @property({ type: String }) accessor selectedOption = '';
  @property({ type: Object }) accessor content: Record<string, unknown> = {};
  @property({ attribute: false }) accessor onSave: () => void = () => {};
  @property({ attribute: false }) accessor onCancel: () => void = () => {};
  @property({ attribute: false }) accessor onDropdownChange: (newOption: string) => void = () => {};
  @property({ attribute: false }) accessor getExternalContent: () => string = () => '';

  handleDropdownChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newOption = target.value;

    // Text and Diff are two views of the *same* editor buffer, so moving between
    // them discards nothing and must not prompt — and in particular Diff has to
    // keep the pending edits, or there would be nothing left to diff against.
    if (isTextualView(this.selectedOption) && isTextualView(newOption)) {
      this.selectedOption = newOption;
      this.onDropdownChange(newOption);
      return;
    }

    const confirmSwitch = confirm(
      'Switching the view will discard any current changes. Do you want to proceed?',
    );
    if (confirmSwitch) {
      this.selectedOption = newOption;
      this.onDropdownChange(newOption);
    } else {
      target.value = this.selectedOption;
    }
  }

  handleSaveClick() {
    if (this.onSave) {
      this.content = this.getEditedContent() as Record<string, unknown>;
      this.onSave();
    }
  }

  handleCancelClick() {
    if (this.onCancel) {
      this.content = this.getEditedContent() as Record<string, unknown>;
      this.onCancel();
    }
  }

  handleCopyClick() {
    let content: unknown;
    if (this.selectedOption === 'tree') {
      content = this.getEditedContent();
    } else {
      content = JSON.parse(this.getExternalContent());
    }
    navigator.clipboard
      .writeText(JSON.stringify(content, null, 2))
      .then(() => {
        alert('Schema copied to clipboard!');
      })
      .catch((err) => {
        alert('Failed to copy schema: ' + err);
      });
  }

  handleDownloadClick() {
    let content: unknown;
    if (this.selectedOption === 'tree') {
      content = this.getEditedContent();
    } else {
      content = JSON.parse(this.getExternalContent());
    }
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.json';
    a.click();
    URL.revokeObjectURL(url);
    alert('Schema downloaded as schema.json!');
  }

  getEditedContent(): unknown {
    const tree = this.shadowRoot!.querySelector('keep-source-tree') as TreeEl | null;
    if (tree) {
      return tree.editedContent;
    }
    return this.content;
  }

  render() {
    return html`
        <header>
            <section class="view-switcher">
                <select @change="${this.handleDropdownChange}" .value="${this.selectedOption}">
                    <option value="tree">Tree View</option>
                    <option value="text">Text View</option>
                    <option value="diff">Diff View</option>
                </select>
                ${this.selectedOption === 'diff'
                  ? html`
                    <span class="diff-hint">
                        <wa-icon library="${FA_LIBRARY}" name="code-compare" label="Diff view"></wa-icon>
                        saved vs. your edits
                    </span>
                    `
                  : ''}
            </section>
            <section class="buttons-container">
                <section class="button-group">
                    <wa-button appearance="plain" size="s" title="Copy" label="Copy to clipboard" @click="${this.handleCopyClick}">
                        <wa-icon library="${FA_LIBRARY}" name="copy" label="Copy to clipboard"></wa-icon>
                    </wa-button>
                    <wa-button appearance="plain" size="s" title="Download" label="Download" @click="${this.handleDownloadClick}">
                        <wa-icon library="${FA_LIBRARY}" name="download" label="Download"></wa-icon>
                    </wa-button>
                </section>
                <section class="button-group">
                    <wa-button class="cancel" appearance="plain" size="s" title="Cancel" label="Cancel" @click="${this.handleCancelClick}">
                        <wa-icon library="${FA_LIBRARY}" name="xmark" label="Cancel"></wa-icon>
                    </wa-button>
                    <wa-button class="save" appearance="plain" size="s" title="Save" label="Save" @click="${this.handleSaveClick}">
                        <wa-icon library="${FA_LIBRARY}" name="floppy-disk" label="Save"></wa-icon>
                    </wa-button>
                </section>
            </section>
        </header>
        <main>
            ${this.selectedOption === 'tree'
              ? html`
                <keep-source-tree .content="${this.content}"></keep-source-tree>
                `
              : html`
                <section></section>
            `}
        </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-source': SourceContents;
  }
}
