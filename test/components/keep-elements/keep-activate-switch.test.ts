/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { store } from '../../../src/store/store';
import { closeSnackbar } from '../../../src/store/alerts/action';
import { setApiLoading } from '../../../src/store/dialog/action';
import { AGENTS_ERROR, INIT_STATE, VIEWS_ERROR } from '../../../src/store/databases/types';
import '../../../src/components/keep-elements/keep-activate-switch';
import type ActivateSwitch from '../../../src/components/keep-elements/keep-activate-switch';
import type { KeepActivateSwitchToggleDetail } from '../../../src/components/keep-elements/keep-activate-switch';

const TAG = 'keep-activate-switch';

const ACTIVE_VIEW = { viewName: 'ActiveView', viewActive: true };
const INACTIVE_VIEW = { viewName: 'InactiveView', viewActive: false };
const ACTIVE_AGENT = { agentName: 'SendDigest', agentActive: true };
const INACTIVE_AGENT = { agentName: 'NightlyClean', agentActive: false };

/**
 * The element test for what used to be `forms/ActivateSwitch.tsx`.
 *
 * It had no test of its own — every assertion on it lived in `AgentsTable.test.tsx`, which
 * could only reach the two labels and the click target. Those four still live there,
 * against the real bridge; everything the React component did that no test ever saw is
 * here: the error-flag branches, the reset-columns dialog, and the fact that the flip is
 * optimistic and never reverts.
 */
describe('keep-activate-switch', () => {
  const reset = () => {
    store.dispatch({ type: INIT_STATE });
    store.dispatch(closeSnackbar());
  };

  beforeEach(reset);

  afterEach(() => {
    cleanupLit();
    reset();
  });

  const toggle = (el: ActivateSwitch) =>
    el.shadowRoot!.querySelector<HTMLButtonElement>('button.toggle-container')!;

  const dialog = (el: ActivateSwitch) => el.shadowRoot!.querySelector<HTMLDialogElement>('dialog')!;

  const action = (el: ActivateSwitch, label: string) =>
    [...el.shadowRoot!.querySelectorAll('keep-button')].find(
      (button) => button.textContent?.trim() === label,
    ) as HTMLElement;

  /** The label of the filled half, which is the one showing current state. */
  const filled = (el: ActivateSwitch) =>
    el.shadowRoot!.querySelector('.toggle-btn')!.textContent?.trim();

  /** The label of the quiet half — the state a click would move to. */
  const ghost = (el: ActivateSwitch) =>
    el.shadowRoot!.querySelector('.unchecked')!.textContent?.trim();

  /** Records both events, so "emitted nothing" is assertable rather than assumed. */
  const listen = (el: ActivateSwitch) => {
    const calls: Array<{ type: string; detail: KeepActivateSwitchToggleDetail }> = [];
    for (const name of ['toggle-active', 'toggle-inactive']) {
      el.addEventListener(name, (event) =>
        calls.push({
          type: name,
          detail: (event as CustomEvent<KeepActivateSwitchToggleDetail>).detail,
        }),
      );
    }
    return calls;
  };

  const mount = (props: Partial<ActivateSwitch>) => mountLit<ActivateSwitch>(TAG, props);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  describe('what it shows', () => {
    it('seeds Active from a view record', async () => {
      const el = await mount({ view: ACTIVE_VIEW, type: 'view' });
      expect(filled(el)).toBe('Active');
      expect(ghost(el)).toBe('Inactive');
    });

    it('seeds Inactive from a view record', async () => {
      const el = await mount({ view: INACTIVE_VIEW, type: 'view' });
      expect(filled(el)).toBe('Inactive');
      expect(ghost(el)).toBe('Active');
    });

    it('seeds from agentActive when the record is an agent', async () => {
      const active = await mount({ view: ACTIVE_AGENT, type: 'agent' });
      expect(filled(active)).toBe('Active');
      const inactive = await mount({ view: INACTIVE_AGENT, type: 'agent' });
      expect(filled(inactive)).toBe('Inactive');
    });

    it('moves the filled half to the left when inactive', async () => {
      // The two halves never move in the DOM; which side they sit on is the .disable /
      // .left pair, so that is what has to be asserted.
      const active = await mount({ view: ACTIVE_VIEW });
      expect(active.shadowRoot!.querySelector('.toggle-btn')!.className).not.toContain('disable');
      expect(active.shadowRoot!.querySelector('.unchecked')!.className).toContain('left');

      const inactive = await mount({ view: INACTIVE_VIEW });
      expect(inactive.shadowRoot!.querySelector('.toggle-btn')!.className).toContain('disable');
      expect(inactive.shadowRoot!.querySelector('.unchecked')!.className).not.toContain('left');
    });
  });

  describe('accessibility (#713)', () => {
    it('is a switch that reports its state', async () => {
      const el = await mount({ view: INACTIVE_VIEW, type: 'view' });
      expect(toggle(el).getAttribute('role')).toBe('switch');
      expect(toggle(el).getAttribute('aria-checked')).toBe('false');
      toggle(el).click();
      await el.updateComplete;
      expect(toggle(el).getAttribute('aria-checked')).toBe('true');
    });

    it('names itself after the record, not after the word on the pill', async () => {
      const view = await mount({ view: ACTIVE_VIEW, type: 'view' });
      expect(toggle(view).getAttribute('aria-label')).toBe('View ActiveView');
      const agent = await mount({ view: ACTIVE_AGENT, type: 'agent' });
      expect(toggle(agent).getAttribute('aria-label')).toBe('Agent SendDigest');
    });

    it('still has a name when the record has none', async () => {
      const el = await mount({ view: { viewActive: false }, type: 'view' });
      expect(toggle(el).getAttribute('aria-label')).toBe('View active');
    });

    it('is a real button, so Enter and Space operate it', async () => {
      // jsdom runs no default action for a key event, so the keyboard cannot be driven
      // here — what makes it work is that the control is a <button> rather than the
      // click-handling <div> it used to be. Asserting the element and its focusability is
      // the part of that this environment can see; the rest is the platform's.
      const el = await mount({ view: ACTIVE_VIEW });
      expect(toggle(el).tagName).toBe('BUTTON');
      expect(toggle(el).type).toBe('button');
      expect(toggle(el).hasAttribute('tabindex')).toBe(false);
      toggle(el).focus();
      expect(el.shadowRoot!.activeElement).toBe(toggle(el));
    });

    it('marks itself disabled while saving without becoming inert', async () => {
      const el = await mount({ view: ACTIVE_VIEW });
      expect(toggle(el).getAttribute('aria-disabled')).toBe('false');
      store.dispatch(setApiLoading(true));
      await el.updateComplete;
      // aria-disabled, not disabled: the control still raises the "please wait" alert, so
      // a real `disabled` would swallow the only feedback the user gets.
      expect(toggle(el).getAttribute('aria-disabled')).toBe('true');
      expect(toggle(el).disabled).toBe(false);
    });
  });

  describe('activating', () => {
    it('asks the table to activate, and flips without waiting for it', async () => {
      const el = await mount({ view: INACTIVE_AGENT, type: 'agent' });
      const calls = listen(el);
      toggle(el).click();
      await el.updateComplete;
      expect(calls).toHaveLength(1);
      expect(calls[0].type).toBe('toggle-active');
      expect(calls[0].detail.view).toBe(INACTIVE_AGENT);
      expect(filled(el)).toBe('Active');
    });

    it('asks the table to deactivate an agent, with no confirmation', async () => {
      const el = await mount({ view: ACTIVE_AGENT, type: 'agent' });
      const calls = listen(el);
      toggle(el).click();
      await el.updateComplete;
      expect(calls.map((c) => c.type)).toEqual(['toggle-inactive']);
      expect(filled(el)).toBe('Inactive');
      expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
    });

    it('never reverts, and never re-reads the record', async () => {
      // The activation thunk is fired and not awaited, and the seed happens once. So a
      // failed save leaves the pill saying Active over a record that still says inactive
      // — the React version's behaviour, kept deliberately rather than by accident.
      const el = await mount({ view: INACTIVE_AGENT, type: 'agent' });
      toggle(el).click();
      await el.updateComplete;
      el.view = { ...INACTIVE_AGENT, agentActive: false };
      await el.updateComplete;
      expect(filled(el)).toBe('Active');
    });
  });

  describe('deactivating a view', () => {
    it('asks first, and emits nothing until it is answered', async () => {
      const el = await mount({ view: ACTIVE_VIEW, type: 'view' });
      const calls = listen(el);
      toggle(el).click();
      await el.updateComplete;
      expect(calls).toEqual([]);
      expect(filled(el)).toBe('Active');
      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
      expect(dialog(el).getAttribute('aria-label')).toBe('Reset View Columns?');
    });

    it('warns what will be lost, and says so through aria-describedby', async () => {
      const el = await mount({ view: ACTIVE_VIEW, type: 'view' });
      toggle(el).click();
      await el.updateComplete;
      const describedBy = dialog(el).getAttribute('aria-describedby')!;
      expect(el.shadowRoot!.getElementById(describedBy)!.textContent).toContain(
        'reset all columns',
      );
    });

    it('deactivates on Yes', async () => {
      const el = await mount({ view: ACTIVE_VIEW, type: 'view' });
      const calls = listen(el);
      toggle(el).click();
      await el.updateComplete;
      action(el, 'Yes').click();
      await el.updateComplete;
      expect(calls.map((c) => c.type)).toEqual(['toggle-inactive']);
      expect(calls[0].detail.view).toBe(ACTIVE_VIEW);
      expect(filled(el)).toBe('Inactive');
      expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
    });

    it('leaves the view alone on No', async () => {
      const el = await mount({ view: ACTIVE_VIEW, type: 'view' });
      const calls = listen(el);
      toggle(el).click();
      await el.updateComplete;
      action(el, 'No').click();
      await el.updateComplete;
      expect(calls).toEqual([]);
      expect(filled(el)).toBe('Active');
      expect(el.resetView).toBe(false);
    });

    it('leaves the view alone when the header close is used', async () => {
      const el = await mount({ view: ACTIVE_VIEW, type: 'view' });
      const calls = listen(el);
      toggle(el).click();
      await el.updateComplete;
      const header = el.shadowRoot!.querySelector('keep-form-dialog-header') as HTMLElement & {
        updateComplete: Promise<boolean>;
      };
      await header.updateComplete;
      header.shadowRoot!.querySelector<HTMLButtonElement>('button.close')!.click();
      await el.updateComplete;
      expect(calls).toEqual([]);
      expect(el.resetView).toBe(false);
    });

    it('can be reopened after Escape, which the React version could not', async () => {
      // Escape closes a modal dialog natively and fires `cancel`. The React version did
      // not listen for it, so the flag stayed true behind a shut dialog and the next click
      // — which only sets it true again — changed nothing. The view could not be
      // deactivated again for the life of the page.
      const el = await mount({ view: ACTIVE_VIEW, type: 'view' });
      toggle(el).click();
      await el.updateComplete;
      dialog(el).dispatchEvent(new Event('cancel'));
      await el.updateComplete;
      expect(el.resetView).toBe(false);
      toggle(el).click();
      await el.updateComplete;
      expect(el.resetView).toBe(true);
      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(2);
    });
  });

  describe('while a save is in flight', () => {
    it('says wait and does nothing else', async () => {
      const el = await mount({ view: INACTIVE_VIEW, type: 'view' });
      const calls = listen(el);
      store.dispatch(setApiLoading(true));
      await el.updateComplete;
      toggle(el).click();
      await el.updateComplete;
      expect(calls).toEqual([]);
      expect(filled(el)).toBe('Inactive');
      expect(store.getState().alert).toMatchObject({
        visible: true,
        message: 'Please wait while views are still saving!',
      });
    });

    it('uses the record kind in the message', async () => {
      const el = await mount({ view: INACTIVE_AGENT, type: 'agent' });
      store.dispatch(setApiLoading(true));
      await el.updateComplete;
      toggle(el).click();
      expect(store.getState().alert.message).toBe('Please wait while agents are still saving!');
    });
  });

  /**
   * The last two branches, reachable only when *both* flags are set — the second branch
   * tests `!updateViewError || !updateAgentError`, one condition over both — where the
   * click clears one flag and does nothing else, so the following click acts normally.
   *
   * Both are dispatched as bare action objects, which is why `databases/reducer.ts` still
   * matches these two types literally in `extraReducers`. A generated creator would
   * namespace them and this dispatch would become a silent no-op.
   */
  describe('when both update-error flags are set', () => {
    const setBothErrors = () => {
      store.dispatch({ type: VIEWS_ERROR, payload: true });
      store.dispatch({ type: AGENTS_ERROR, payload: true });
    };

    it('clears the view error instead of toggling', async () => {
      const el = await mount({ view: INACTIVE_VIEW, type: 'view' });
      const calls = listen(el);
      setBothErrors();
      expect(store.getState().databases.updateViewError).toBe(true);
      toggle(el).click();
      await el.updateComplete;
      expect(store.getState().databases.updateViewError).toBe(false);
      expect(store.getState().databases.updateAgentError).toBe(true);
      expect(calls).toEqual([]);
      expect(filled(el)).toBe('Inactive');
    });

    it('clears the agent error instead of toggling', async () => {
      const el = await mount({ view: INACTIVE_AGENT, type: 'agent' });
      const calls = listen(el);
      setBothErrors();
      toggle(el).click();
      await el.updateComplete;
      expect(store.getState().databases.updateAgentError).toBe(false);
      expect(store.getState().databases.updateViewError).toBe(true);
      expect(calls).toEqual([]);
    });

    it('toggles again once one flag is clear', async () => {
      const el = await mount({ view: INACTIVE_AGENT, type: 'agent' });
      setBothErrors();
      toggle(el).click();
      await el.updateComplete;
      const calls = listen(el);
      toggle(el).click();
      await el.updateComplete;
      expect(calls.map((c) => c.type)).toEqual(['toggle-active']);
    });
  });
});
