/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UnsavedChangesDialog from '../../../src/components/dialogs/UnsavedChangesDialog';

/**
 * All three actions are now the same `keep-button` element (#701), told apart by their
 * label rather than by three different tag names. Selecting on the label is also closer
 * to what a user actually distinguishes.
 */
const button = (label: string) =>
  [...document.querySelectorAll('keep-button')].find(
    (b) => b.textContent?.trim() === label,
  ) as HTMLElement | undefined;

/**
 * The header is `keep-form-dialog-header` since #806, so its heading and close button live in
 * a shadow root. Lit's first render lands on a microtask, hence the `updateComplete` await.
 */
const header = async () => {
  const el = document.querySelector('keep-form-dialog-header') as HTMLElement & {
    updateComplete: Promise<boolean>;
  };
  await el.updateComplete;
  return el.shadowRoot!;
};

describe('UnsavedChangesDialog', () => {
  const defaultProps = {
    open: true,
    onSave: vi.fn(),
    onDiscard: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title, message, and all three buttons when open', async () => {
    render(<UnsavedChangesDialog {...defaultProps} />);

    expect((await header()).querySelector('.heading')!.textContent).toContain(
      'Unsaved Changes',
    );
    expect(
      screen.getByText(/Changes have been made/)
    ).toBeInTheDocument();
    expect(button('Yes')).toBeInTheDocument();
    expect(button('No')).toBeInTheDocument();
    expect(button('Cancel')).toBeInTheDocument();
    // The variants carry the visual distinction now that the tag is shared. They are
    // read as properties, not attributes: `variant` is a declared reactive property, so
    // @lit/react sets it via the property and never reflects it to an attribute.
    expect((button('No') as unknown as { variant: string }).variant).toBe('danger');
    expect((button('Cancel') as unknown as { variant: string }).variant).toBe('neutral');
  });

  it('does not show the dialog when open is false', () => {
    render(<UnsavedChangesDialog {...defaultProps} open={false} />);
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
  });

  it('calls onSave when Yes is clicked', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);
    fireEvent.click(button('Yes')!);
    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
    expect(defaultProps.onDiscard).not.toHaveBeenCalled();
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('calls onDiscard when No is clicked', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);
    fireEvent.click(button('No')!);
    expect(defaultProps.onDiscard).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSave).not.toHaveBeenCalled();
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);
    fireEvent.click(button('Cancel')!);
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSave).not.toHaveBeenCalled();
    expect(defaultProps.onDiscard).not.toHaveBeenCalled();
  });

  it('calls onCancel when the header close button is clicked', async () => {
    render(<UnsavedChangesDialog {...defaultProps} />);
    fireEvent.click((await header()).querySelector('button.close')!);
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSave).not.toHaveBeenCalled();
    expect(defaultProps.onDiscard).not.toHaveBeenCalled();
  });
});
