/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { bodyRows, cellTexts, headerLabels } from '../../test-utils/tables';
import ColumnDetails from '../../../src/components/forms/ColumnDetails';

const columns = [
  { name: 'FirstName', externalName: 'first_name' },
  { name: 'LastName', externalName: 'last_name' },
];

function renderColumnDetails(chosenColumns: any[] = columns) {
  const handleEditColumn = vi.fn();
  const setRemoveColumn = vi.fn();
  const setEditColumn = vi.fn();
  renderWithProviders(
    <ColumnDetails
      viewName="TestView"
      column={null}
      chosenColumns={chosenColumns}
      handleEditColumn={handleEditColumn}
      setEditColumn={setEditColumn}
      setRemoveColumn={setRemoveColumn}
    />,
  );
  return { handleEditColumn, setRemoveColumn };
}

describe('ColumnDetails — structure', () => {
  it('labels the columns', () => {
    renderColumnDetails();
    expect(headerLabels()).toEqual(['', 'Column Name', 'External Name']);
  });

  it('names the table for assistive tech', () => {
    renderColumnDetails();
    expect(screen.getByRole('table', { name: 'edit columns table' })).toBeInTheDocument();
  });

  it('renders one row per chosen column, in order', () => {
    renderColumnDetails();
    const rows = bodyRows();
    expect(rows).toHaveLength(2);
    expect(cellTexts(rows[0])[1]).toBe('FirstName');
    expect(cellTexts(rows[1])[1]).toBe('LastName');
  });

  it('renders no body rows when nothing is chosen', () => {
    renderColumnDetails([]);
    expect(bodyRows()).toHaveLength(0);
  });

  it('shows the current external name as the field placeholder', () => {
    renderColumnDetails();
    expect(screen.getByPlaceholderText('first_name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('last_name')).toBeInTheDocument();
  });
});

describe('ColumnDetails — interaction', () => {
  it('reports an edited external name with its column', () => {
    const { handleEditColumn } = renderColumnDetails();
    fireEvent.change(screen.getByPlaceholderText('first_name'), { target: { value: 'given' } });
    expect(handleEditColumn).toHaveBeenCalledWith(columns[0], 'given');
  });

  it('asks to remove the column whose delete icon was clicked', () => {
    const { setRemoveColumn } = renderColumnDetails();
    const icon = bodyRows()[1].querySelector('.delete-icon');
    expect(icon).toBeTruthy();
    fireEvent.click(icon!);
    expect(setRemoveColumn).toHaveBeenCalledWith('LastName');
  });
});

describe('ColumnDetails — validation', () => {
  it('explains a duplicate external name', () => {
    renderColumnDetails([{ name: 'FirstName', externalName: 'dup', error: 'duplicate' }]);
    expect(screen.getByText('Cannot have duplicate external names!')).toBeInTheDocument();
  });

  it('shows no message for an unrecognised error code', () => {
    renderColumnDetails([{ name: 'FirstName', externalName: 'x', error: 'something-else' }]);
    expect(screen.queryByText('Cannot have duplicate external names!')).not.toBeInTheDocument();
  });

  it('shows no message when the column is clean', () => {
    renderColumnDetails();
    expect(screen.queryByText(/duplicate/i)).not.toBeInTheDocument();
  });
});
