import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import UnsavedChangesDialog from './UnsavedChangesDialog';

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
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<UnsavedChangesDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
  });

  it('calls onSave when Yes is clicked', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Yes'));
    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
    expect(defaultProps.onDiscard).not.toHaveBeenCalled();
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('calls onDiscard when No is clicked', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('No'));
    expect(defaultProps.onDiscard).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSave).not.toHaveBeenCalled();
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSave).not.toHaveBeenCalled();
    expect(defaultProps.onDiscard).not.toHaveBeenCalled();
  });

  it('calls onCancel when dialog backdrop is clicked (Escape key)', () => {
    render(<UnsavedChangesDialog {...defaultProps} />);
    // MUI Dialog triggers onClose (mapped to onCancel) on Escape
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });
});
