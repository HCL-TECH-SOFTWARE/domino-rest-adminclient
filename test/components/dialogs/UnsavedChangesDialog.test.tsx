import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UnsavedChangesDialog from '../../../src/components/dialogs/UnsavedChangesDialog';

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

  it('renders title, message, and all three buttons when open', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);

    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    expect(
      screen.getByText(/Changes have been made/)
    ).toBeInTheDocument();
    expect(document.querySelector('keep-button-yes')).toBeInTheDocument();
    expect(document.querySelector('keep-button-no')).toBeInTheDocument();
    expect(document.querySelector('keep-button-neutral')).toBeInTheDocument();
  });

  it('does not show the dialog when open is false', () => {
    render(<UnsavedChangesDialog {...defaultProps} open={false} />);
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
  });

  it('calls onSave when Yes is clicked', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);
    fireEvent.click(document.querySelector('keep-button-yes')!);
    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
    expect(defaultProps.onDiscard).not.toHaveBeenCalled();
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('calls onDiscard when No is clicked', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);
    fireEvent.click(document.querySelector('keep-button-no')!);
    expect(defaultProps.onDiscard).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSave).not.toHaveBeenCalled();
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);
    fireEvent.click(document.querySelector('keep-button-neutral')!);
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSave).not.toHaveBeenCalled();
    expect(defaultProps.onDiscard).not.toHaveBeenCalled();
  });

  it('calls onCancel when the header close button is clicked', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);
    fireEvent.click(document.querySelector('.dialog-header-close')!);
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSave).not.toHaveBeenCalled();
    expect(defaultProps.onDiscard).not.toHaveBeenCalled();
  });
});
