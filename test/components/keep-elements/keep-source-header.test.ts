/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-source-header';
import { isTextualView } from '../../../src/components/keep-elements/keep-source-header';
import type SourceContents from '../../../src/components/keep-elements/keep-source-header';

const TAG = 'keep-source';
const q = (el: SourceContents, sel: string) => el.shadowRoot!.querySelector(sel);

describe('keep-source-header (tag: keep-source)', () => {
  afterEach(cleanupLit);

  it('registers under the keep-source tag', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the view switcher and action buttons', async () => {
    const el = await mountLit<SourceContents>(TAG);
    expect(q(el, 'select')).toBeTruthy();
    expect(q(el, 'option[value="tree"]')).toBeTruthy();
    expect(q(el, 'option[value="text"]')).toBeTruthy();
    expect(q(el, 'wa-button[title="Copy"]')).toBeTruthy();
    expect(q(el, 'wa-button[title="Download"]')).toBeTruthy();
    expect(q(el, 'wa-button[title="Cancel"]')).toBeTruthy();
    expect(q(el, 'wa-button[title="Save"]')).toBeTruthy();
  });

  it('offers Diff View alongside Tree and Text', async () => {
    const el = await mountLit<SourceContents>(TAG);
    expect(q(el, 'option[value="diff"]')).toBeTruthy();
  });

  it('names the two sides only while in diff view', async () => {
    const diff = await mountLit<SourceContents>(TAG, { selectedOption: 'diff' });
    expect(q(diff, 'wa-icon[name="code-compare"]')).toBeTruthy();

    const text = await mountLit<SourceContents>(TAG, { selectedOption: 'text' });
    expect(q(text, 'wa-icon[name="code-compare"]')).toBeNull();
  });

  describe('isTextualView', () => {
    it('covers the Monaco-backed views and excludes the tree', () => {
      expect(isTextualView('text')).toBe(true);
      expect(isTextualView('diff')).toBe(true);
      expect(isTextualView('tree')).toBe(false);
    });
  });

  // Text and Diff share one editor buffer. Prompting to discard on that switch would
  // be a lie, and actually discarding would leave the diff with nothing to show.
  it('switches straight between Text and Diff without a discard prompt', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onDropdownChange = vi.fn();
    const el = await mountLit<SourceContents>(TAG, { selectedOption: 'text', onDropdownChange });
    const select = q(el, 'select') as HTMLSelectElement;
    select.value = 'diff';
    select.dispatchEvent(new Event('change'));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(el.selectedOption).toBe('diff');
    expect(onDropdownChange).toHaveBeenCalledWith('diff');
  });

  it('still prompts to discard when leaving the tree for a text view', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onDropdownChange = vi.fn();
    const el = await mountLit<SourceContents>(TAG, { selectedOption: 'tree', onDropdownChange });
    const select = q(el, 'select') as HTMLSelectElement;
    select.value = 'diff';
    select.dispatchEvent(new Event('change'));

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(el.selectedOption).toBe('diff');
  });

  it('renders the tree editor only in tree view', async () => {
    const text = await mountLit<SourceContents>(TAG, { selectedOption: 'text' });
    expect(q(text, 'keep-source-tree')).toBeNull();

    const tree = await mountLit<SourceContents>(TAG, { selectedOption: 'tree', content: { a: 1 } });
    expect(q(tree, 'keep-source-tree')).toBeTruthy();
  });

  it('invokes onSave when the save button is clicked', async () => {
    const onSave = vi.fn();
    const el = await mountLit<SourceContents>(TAG, { selectedOption: 'text', content: { a: 1 }, onSave });
    (q(el, 'wa-button[title="Save"]') as HTMLElement).click();
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('invokes onCancel when the cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const el = await mountLit<SourceContents>(TAG, { selectedOption: 'text', onCancel });
    (q(el, 'wa-button[title="Cancel"]') as HTMLElement).click();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('switches view and calls onDropdownChange when the user confirms', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onDropdownChange = vi.fn();
    const el = await mountLit<SourceContents>(TAG, { selectedOption: 'tree', onDropdownChange });
    const select = q(el, 'select') as HTMLSelectElement;
    select.value = 'text';
    select.dispatchEvent(new Event('change'));
    expect(el.selectedOption).toBe('text');
    expect(onDropdownChange).toHaveBeenCalledWith('text');
  });

  it('reverts the view and does not call onDropdownChange when the user cancels', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onDropdownChange = vi.fn();
    const el = await mountLit<SourceContents>(TAG, { selectedOption: 'tree', onDropdownChange });
    const select = q(el, 'select') as HTMLSelectElement;
    select.value = 'text';
    select.dispatchEvent(new Event('change'));
    expect(el.selectedOption).toBe('tree');
    expect(onDropdownChange).not.toHaveBeenCalled();
  });

  it('copies the edited schema to the clipboard when Copy is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    const el = await mountLit<SourceContents>(TAG, { selectedOption: 'tree', content: { a: 1 } });
    (q(el, 'wa-button[title="Copy"]') as HTMLElement).click();
    expect(writeText).toHaveBeenCalledOnce();
  });

  it('downloads the schema as a file when Download is clicked', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => 'blob:mock');
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const el = await mountLit<SourceContents>(TAG, { selectedOption: 'tree', content: { a: 1 } });
    (q(el, 'wa-button[title="Download"]') as HTMLElement).click();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });
});
