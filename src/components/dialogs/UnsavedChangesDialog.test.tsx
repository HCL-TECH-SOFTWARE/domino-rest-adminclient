import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import UnsavedChangesDialog from './UnsavedChangesDialog';

// JSDOM does not implement native dialog methods
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close = jest.fn();
});

describe('UnsavedChangesDialog', () => {
  const defaultProps = {
    open: true,
    onSave: jest.fn(),
    onDiscard: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, message, and all three buttons when open', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);

    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    expect(
      screen.getByText(/Changes have been made/)
    ).toBeInTheDocument();
    expect(document.querySelector('lit-button-yes')).toBeInTheDocument();
    expect(document.querySelector('lit-button-no')).toBeInTheDocument();
    expect(document.querySelector('lit-button-neutral')).toBeInTheDocument();
  });

  it('does not show the dialog when open is false', () => {
    render(<UnsavedChangesDialog {...defaultProps} open={false} />);
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
  });

  it('calls onSave when Yes is clicked', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);
    fireEvent.click(document.querySelector('lit-button-yes')!);
    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
    expect(defaultProps.onDiscard).not.toHaveBeenCalled();
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('calls onDiscard when No is clicked', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);
    fireEvent.click(document.querySelector('lit-button-no')!);
    expect(defaultProps.onDiscard).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSave).not.toHaveBeenCalled();
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);
    fireEvent.click(document.querySelector('lit-button-neutral')!);
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
