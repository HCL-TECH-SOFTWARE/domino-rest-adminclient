import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-schema-status';
import type SchemaStatus from '../../../src/components/keep-elements/keep-schema-status';

const TAG = 'keep-schema-status';
const q = (el: SchemaStatus, sel: string) => el.shadowRoot!.querySelector(sel);

describe('keep-schema-status', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the main row with a description and name', async () => {
    const el = await mountLit<SchemaStatus>(TAG, {
      isSchema: true,
      item: { schemaName: 'Orders', apiName: 'OrdersApi', nsfPath: 'db.nsf' },
      schemasWithScopes: [],
    });
    expect(q(el, 'div.main')).toBeTruthy();
    expect(q(el, 'div.description')).toBeTruthy();
    expect(q(el, 'div.name')!.textContent!.trim()).toBe('Orders');
  });

  it('uses the apiName when not in schema mode', async () => {
    const el = await mountLit<SchemaStatus>(TAG, {
      isSchema: false,
      item: { schemaName: 'Orders', apiName: 'OrdersApi', nsfPath: 'db.nsf' },
    });
    expect(q(el, 'div.name')!.textContent!.trim()).toBe('OrdersApi');
  });

  it('shows the tooltip status dot and delete control only in schema mode', async () => {
    const schema = await mountLit<SchemaStatus>(TAG, {
      isSchema: true,
      item: { schemaName: 'Orders', nsfPath: 'db.nsf' },
      schemasWithScopes: [],
    });
    expect(q(schema, 'wa-tooltip')).toBeTruthy();
    expect(q(schema, 'div.api-status')).toBeTruthy();
    expect(q(schema, 'div.delete')).toBeTruthy();

    const api = await mountLit<SchemaStatus>(TAG, {
      isSchema: false,
      item: { apiName: 'OrdersApi' },
    });
    expect(q(api, 'wa-tooltip')).toBeNull();
    expect(q(api, 'div.delete')).toBeNull();
  });

  it('marks the status dot unused unless the schema is used by scopes', async () => {
    const used = await mountLit<SchemaStatus>(TAG, {
      isSchema: true,
      item: { schemaName: 'Orders', nsfPath: 'db.nsf' },
      schemasWithScopes: ['db.nsf:Orders'],
    });
    expect(q(used, 'div.api-status')!.classList.contains('unused')).toBe(false);

    const unused = await mountLit<SchemaStatus>(TAG, {
      isSchema: true,
      item: { schemaName: 'Orders', nsfPath: 'db.nsf' },
      schemasWithScopes: [],
    });
    expect(q(unused, 'div.api-status')!.classList.contains('unused')).toBe(true);
  });

  it('invokes onClickOpen when the description is clicked', async () => {
    const onClickOpen = vi.fn();
    const el = await mountLit<SchemaStatus>(TAG, {
      isSchema: true,
      item: { schemaName: 'Orders', nsfPath: 'db.nsf' },
      onClickOpen,
    });
    (q(el, 'div.description') as HTMLElement).click();
    expect(onClickOpen).toHaveBeenCalledOnce();
  });

  it('invokes onDelete when the delete control is clicked', async () => {
    const onDelete = vi.fn();
    const el = await mountLit<SchemaStatus>(TAG, {
      isSchema: true,
      item: { schemaName: 'Orders', nsfPath: 'db.nsf' },
      onDelete,
    });
    (q(el, 'div.delete') as HTMLElement).click();
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
