/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import * as Yup from 'yup';
import { ReactHost, useFormController } from '../../src/store/FormController.react';
import type { FormController } from '../../src/store/FormController';

/**
 * The React host for `FormController` (#717).
 *
 * `FormController` is a Lit `ReactiveController`, so a `.tsx` file cannot use it without a host.
 * These tests cover the two things a hook wrapping a long-lived class has to get right —
 * **one instance across renders**, and **fresh closures on every submit** — plus the host
 * contract itself.
 *
 * The stale-closure cases are the reason this file is long. Capturing the first render's
 * `onSubmit` would produce a save that writes the wrong thing only sometimes, which is the
 * hardest possible bug to see in a form.
 */

interface Values {
  schemaName: string;
  description: string;
  additionalModes: { odata: boolean; dql: boolean };
}

const INITIAL: Values = {
  schemaName: '',
  description: '',
  additionalModes: { odata: false, dql: false },
};

/** Hands the controller back to the test while still rendering through React. */
function Harness({
  onSubmit,
  schema,
  initialValues = INITIAL,
  expose,
}: {
  onSubmit: (values: Values) => void | Promise<void>;
  schema?: Yup.AnyObjectSchema;
  initialValues?: Values;
  expose?: (form: FormController<Values>) => void;
}) {
  const form = useFormController<Values>({ initialValues, onSubmit, schema });
  expose?.(form);
  return (
    <div>
      <span data-testid="schemaName">{form.values.schemaName}</span>
      <span data-testid="odata">{String(form.values.additionalModes.odata)}</span>
      <span data-testid="error">{form.errors.schemaName ?? ''}</span>
      <span data-testid="submitted">{String(form.submitted)}</span>
      <span data-testid="submitting">{String(form.submitting)}</span>
    </div>
  );
}

const mount = (props: Parameters<typeof Harness>[0]) => {
  let form!: FormController<Values>;
  const view = render(<Harness {...props} expose={(f) => (form = f)} />);
  return { view, form: () => form };
};

describe('useFormController', () => {
  it('returns the same controller across renders', () => {
    // The whole point of the ref: a controller rebuilt on a parent render would discard
    // everything the user has typed.
    const seen: Array<FormController<Values>> = [];
    const { view, form } = mount({ onSubmit: () => {}, expose: (f) => seen.push(f) });
    act(() => form().setValue('schemaName', 'abc'));
    view.rerender(<Harness onSubmit={() => {}} expose={(f) => seen.push(f)} />);
    expect(new Set(seen).size).toBe(1);
    expect(form().values.schemaName).toBe('abc');
  });

  it('re-renders the component on a mutation', () => {
    const { form } = mount({ onSubmit: () => {} });
    expect(screen.getByTestId('schemaName').textContent).toBe('');
    act(() => form().setValue('schemaName', 'quickconfig'));
    expect(screen.getByTestId('schemaName').textContent).toBe('quickconfig');
  });

  it('re-renders on a nested write, which every one of the five forms needs', () => {
    const { form } = mount({ onSubmit: () => {} });
    expect(screen.getByTestId('odata').textContent).toBe('false');
    act(() => form().setValue('additionalModes.odata', true));
    expect(screen.getByTestId('odata').textContent).toBe('true');
  });

  it('reflects submitted and submitting in the render', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const { form } = mount({ onSubmit: () => gate });

    expect(screen.getByTestId('submitted').textContent).toBe('false');
    let settled!: Promise<void>;
    act(() => {
      settled = form().submit();
    });
    expect(screen.getByTestId('submitted').textContent).toBe('true');
    expect(screen.getByTestId('submitting').textContent).toBe('true');

    await act(async () => {
      release();
      await settled;
    });
    expect(screen.getByTestId('submitting').textContent).toBe('false');
  });

  // ---- the stale-closure cases --------------------------------------------------------------

  it('calls the LATEST onSubmit, not the one from the first render', async () => {
    // The bug this guards: `onSubmit` closes over props, state and `dispatch`. Every one of the
    // five owners builds its payload inside `onSubmit` from values outside the form — the icon
    // in QuickConfigFormContainer, `isEdit` in ScopeFormContainer, the dragged card in Kanban.
    // A captured closure submits the state as it was when the form first mounted.
    const calls: string[] = [];
    function Parent() {
      const [tag, setTag] = useState('first');
      return (
        <>
          <button onClick={() => setTag('second')}>change</button>
          {/* Braces, not a concise body: `push` returns a number, and `onSubmit`'s
              `void | Promise<void>` is a union — so TS's "a value-returning function is
              assignable to a void-returning one" allowance does not apply. `tsc -b` catches
              this; `tsc --noEmit` does not look at `test/` at all. */}
          <Harness
            onSubmit={() => {
              calls.push(tag);
            }}
            expose={(f) => (held = f)}
          />
        </>
      );
    }
    let held!: FormController<Values>;
    render(<Parent />);

    await act(async () => {
      await held.submit();
    });
    expect(calls).toEqual(['first']);

    act(() => screen.getByText('change').click());
    await act(async () => {
      await held.submit();
    });
    expect(calls).toEqual(['first', 'second']);
  });

  it('validates against the LATEST schema', async () => {
    // A yup `.test()` may close over data outside the form — AddImportDialog's "unique schema
    // name" rule reads the databases slice. A captured schema validates against a stale slice,
    // so a name that has just been taken still passes.
    //
    // The taken list is passed **by value** per schema, deliberately. Closing over one mutable
    // Set instead makes this test pass whether the schema is captured or read fresh, because
    // even the first render's schema would see the mutation — it proved nothing, which is how
    // it was written first.
    const schemaFor = (taken: string[]) =>
      Yup.object().shape({
        schemaName: Yup.string().test('unique', 'already exists', (v) => !taken.includes(v ?? '')),
      }) as Yup.AnyObjectSchema;

    let held!: FormController<Values>;
    const view = render(
      <Harness onSubmit={() => {}} schema={schemaFor([])} expose={(f) => (held = f)} />,
    );
    act(() => held.setValue('schemaName', 'demo'));
    await act(async () => {
      await held.submit();
    });
    expect(screen.getByTestId('error').textContent).toBe('');

    // the outside world changes, and the parent re-renders with a schema that knows
    view.rerender(
      <Harness onSubmit={() => {}} schema={schemaFor(['demo'])} expose={(f) => (held = f)} />,
    );
    await act(async () => {
      await held.submit();
    });
    expect(screen.getByTestId('error').textContent).toBe('already exists');
  });

  it('keeps the FIRST initialValues, which is what Formik did', async () => {
    // Formik's `enableReinitialize` defaults to false, so this is faithful rather than fixed.
    // Recorded as a test because it is the one option that is *not* read fresh, and a converted
    // edit form that resets after the selected record changes will resets to the first record.
    let held!: FormController<Values>;
    const view = render(
      <Harness
        onSubmit={() => {}}
        initialValues={{ ...INITIAL, schemaName: 'one' }}
        expose={(f) => (held = f)}
      />,
    );
    view.rerender(
      <Harness
        onSubmit={() => {}}
        initialValues={{ ...INITIAL, schemaName: 'two' }}
        expose={(f) => (held = f)}
      />,
    );
    act(() => held.setValue('schemaName', 'edited'));
    act(() => held.reset());
    expect(held.values.schemaName).toBe('one');
  });

  // ---- #887's guard, through the adapter ----------------------------------------------------

  it('a double-clicked submit is still one write through React', async () => {
    // #889 guards this in the controller. Asserted here too because the adapter is what the
    // five owners will actually call, and a host that somehow reconstructed the controller
    // between the two clicks would reopen the hole without failing the controller's own tests.
    const onSubmit = vi.fn(async () => {
      await Promise.resolve();
    });
    const { form } = mount({ onSubmit });
    await act(async () => {
      await Promise.all([form().submit(), form().submit()]);
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

/**
 * The host contract, tested directly.
 *
 * `ReactHost` is exported for this and is not part of the module's API. It has to be tested
 * here rather than through the hook because the only controller in production —
 * `FormController` — has an empty `hostConnected` and no `hostDisconnected`, so nothing
 * observable would break if the host never called either. That is precisely the kind of silent
 * hole worth pinning: a `StoreController` handed to this host would subscribe to nothing.
 */
describe('ReactHost', () => {
  const probe = () => ({
    connected: 0,
    disconnected: 0,
    hostConnected() {
      this.connected += 1;
    },
    hostDisconnected() {
      this.disconnected += 1;
    },
  });

  it('connects controllers on connect and disconnects them on disconnect', () => {
    const host = new ReactHost(() => {});
    const controller = probe();
    host.addController(controller);
    expect(controller.connected).toBe(0); // not before the host is connected

    host.connect();
    expect(controller.connected).toBe(1);
    host.disconnect();
    expect(controller.disconnected).toBe(1);
  });

  it('connects a controller added while already connected, as ReactiveElement does', () => {
    const host = new ReactHost(() => {});
    host.connect();
    const controller = probe();
    host.addController(controller);
    expect(controller.connected).toBe(1);
  });

  it('does not connect or disconnect twice', () => {
    const host = new ReactHost(() => {});
    const controller = probe();
    host.addController(controller);
    host.connect();
    host.connect();
    host.disconnect();
    host.disconnect();
    expect(controller.connected).toBe(1);
    expect(controller.disconnected).toBe(1);
  });

  it('removeController does not call hostDisconnected, matching Lit', () => {
    // Lit's removeController only deletes from the set. Pinned because "more correct than the
    // real host" is its own bug: a controller must behave the same under either.
    const host = new ReactHost(() => {});
    const controller = probe();
    host.addController(controller);
    host.connect();
    host.removeController(controller);
    expect(controller.disconnected).toBe(0);
    host.disconnect();
    expect(controller.disconnected).toBe(0); // and it is no longer driven at all
  });

  it('requestUpdate asks for a render and leaves updateComplete pending until commit', async () => {
    let renders = 0;
    const host = new ReactHost(() => {
      renders += 1;
    });
    await expect(host.updateComplete).resolves.toBe(true); // nothing pending, as in Lit

    host.requestUpdate();
    expect(renders).toBe(1);

    let resolved = false;
    const waiting = host.updateComplete.then(() => (resolved = true));
    await Promise.resolve();
    expect(resolved).toBe(false);

    host.commit();
    await waiting;
    expect(resolved).toBe(true);
  });

  it('settles a pending updateComplete on disconnect rather than leaking it', async () => {
    // An unmounted host never commits again, so an awaiter would wait for ever.
    const host = new ReactHost(() => {});
    host.connect();
    host.requestUpdate();
    host.disconnect();
    await expect(host.updateComplete).resolves.toBe(true);
  });
});
