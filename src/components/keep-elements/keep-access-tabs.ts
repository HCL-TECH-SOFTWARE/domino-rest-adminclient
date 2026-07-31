/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/dropdown/dropdown.js';
import '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js';
import './keep-add-mode-dialog';
import './keep-confirm-delete-dialog';
import './keep-drawer';
import './keep-mode-fields';
import './keep-test-form';
import './keep-unsaved-changes-dialog';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { FA_LIBRARY } from '../../services/icon-library';
import { getLogger } from '../../services/log-service';
import { setSaveFunction } from '../../store/navigationGuard/saveFunction';
import { setNavigationDirty } from '../../store/navigationGuard/action';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import { toggleDeleteDialog } from '../../store/dialog/action';
import { toggleAlert } from '../../store/alerts/action';
import {
  deleteFormMode,
  updateFormMode,
  updateSchema,
} from '../../store/databases/action';
import { findScopeBySchema } from '../../store/databases/scripts';
import { isEmptyOrSpaces, verifyModeName } from '../../utils/form';
import type { Database, Mode } from '../../store/databases/types';
import type { Router } from '../../router/router';
import type { KeepFieldItem } from './keep-field-container';
import type { KeepFieldIndexChangeDetail, KeepModeFieldState } from './keep-mode-fields';
import type { KeepScriptData, KeepValidationRule } from './keep-script-editor';

const log = getLogger('components/keep-elements/keep-access-tabs');

/**
 * A form mode as this screen reads it.
 *
 * `continueOnError` is not on {@link Mode} but the mode editor has always read and written
 * it, so the widening happens once here rather than through an `any` at each call site.
 */
export type KeepAccessTabMode = Mode & { continueOnError?: boolean };

/** `event.detail` of `page-index-change` — reseed the shared field map from this mode. */
export interface KeepPageIndexChangeDetail {
  /** Position in the mode list whose fields should become the working copy. */
  index: number;
}

/** `event.detail` of `mode-index-change` — the mode the screen is now editing. */
export interface KeepModeIndexChangeDetail {
  index: number;
}

/** `event.detail` of `schema-data-change` — a schema the server has just handed back. */
export interface KeepSchemaDataChangeDetail {
  schemaData: Database;
}

/**
 * `event.detail` of `post-save-action` — the dialog to open once this element has been
 * destroyed by the save spinner and rebuilt. `null` clears a stashed one.
 */
export interface KeepPostSaveActionDetail {
  action: 'add' | 'clone' | null;
}

/** Deep-equality by serialisation, which is what the dirty comparison has always used. */
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** A field row without the two keys the screen decorates it with before showing it. */
const undecorated = (field: Record<string, unknown>): Record<string, unknown> => {
  const rest = { ...field };
  delete rest.content;
  delete rest.id;
  return rest;
};

/**
 * The mode editor: the mode picker and its four actions, the field panel, and the Test
 * Formulas drawer. Tag: `keep-access-tabs`.
 *
 * Replaces `components/access/TabsAccess.tsx`. `keep-access-mode` above it owns the mode
 * list, the schema and the shared field map; this element owns everything that belongs to
 * *the mode being edited* — its scripts, its required list, its validation rules — plus the
 * unsaved-changes machinery, and it is the element that saves.
 *
 * ## No form library, and none needed
 *
 * The React file built a form object for the Test Formulas drawer and threaded it four
 * levels down. `keep-test-form` took ownership of those values when it converted, so what
 * was left here was a form whose `onSubmit` is unreachable and whose only live members were
 * five formula strings — written by direct assignment into the values object, which notified
 * nothing and only appeared to work because an unrelated render always followed. They are
 * five reactive fields now, gathered from the mode when the drawer opens. There is nothing
 * left for a form controller to hold, so there is no form controller here.
 *
 * ## The drawer is rendered directly
 *
 * `applications/FormDrawer.tsx` was a switch over two form names inside a `keep-drawer`. The
 * `TestForm` arm is reproduced inline — the wrapper existed to share a drawer between two
 * screens, and a shared component that switches on a string is not a saving once each screen
 * is an element.
 *
 * ## The unsaved-changes channel is the store, not four props
 *
 * `setHasUnsavedChanges` and a `saveRef` were passed down so the screen above could feed the
 * app-wide navigation guard. That guard keeps its dirty flag in the store and its save
 * function in a module singleton, both reachable from here, so the props are gone: this
 * element dispatches the flag and registers its own save on connect. It also *clears* the
 * registration on disconnect, which the React chain did not — a stale save left behind is
 * called against a screen that is no longer mounted.
 *
 * ## What the shadow boundary cost
 *
 * The two Linaria blocks, the ten `.tabs-access-*` / `.access-*` / `.mode-buttons` rules in
 * `styles.css` and the dozen utility classes layered on them. All restated below. Three
 * things changed rather than being copied, because the originals were light-mode literals or
 * dead:
 *
 * - the mode picker's caption was `#5e5966`, from a Material base-class rule that outranked
 *   the `color-text-primary` beside it in light mode and lost to it in dark. One token now.
 * - the four action captions read `#000` in light mode; they read the same normal-text token
 *   the rest of the converted screens use.
 * - `margin: 5` in the button rule has no unit, so it was dropped at parse and never applied.
 *
 * Two smaller differences are deliberate and visible. The mode name and its caret were two
 * separate buttons opening the same menu; they are one trigger, so the menu has one
 * accessible name and one focus stop. And the Save button's tooltip is gone: the only
 * message it could ever carry is commented out in the original, so `content` was always
 * empty and the tooltip never rendered.
 *
 * ## Accessibility (#713)
 *
 * The picker is a real menu button — the Material menu it replaces synthesised a click per
 * item, which never fired for keyboard selection (#925); `wa-select` covers both. Every
 * action button is a `button` with `type="button"` so it cannot submit anything, and the
 * three that can be unavailable say so with `disabled` rather than only by colour.
 *
 * @fires page-index-change - `CustomEvent<KeepPageIndexChangeDetail>`
 * @fires mode-index-change - `CustomEvent<KeepModeIndexChangeDetail>`
 * @fires field-index-change - `CustomEvent<KeepFieldIndexChangeDetail>`, the same event and
 *   payload `keep-mode-fields` raises, so the screen above needs one handler for both
 * @fires schema-data-change - `CustomEvent<KeepSchemaDataChangeDetail>`
 * @fires post-save-action - `CustomEvent<KeepPostSaveActionDetail>`
 */
@customElement('keep-access-tabs')
export default class AccessTabs extends KeepElement {
  static styles = css`
    /*
     * The page's border-box reset arrives through Web Awesome's native layer on a universal
     * selector, which does not cross a shadow boundary — and this element is 100% wide with
     * 30px of padding and a border, so without it the panel overflows its column.
     */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    /* was the TabAccessContainer styled.div. Its width and top were props, and the one call
       site passed 100 and 0, so they are stated rather than parameterised. */
    :host {
      box-sizing: border-box;
      display: block;
      position: absolute;
      top: 0;
      width: 100%;
      height: 100%;
      min-height: fit-content;
      padding: 30px;
      border: 1px solid var(--wa-color-surface-border);
      border-radius: var(--wa-border-radius-l);
      background-color: var(--keep-surface-accent);
    }

    /* was the TabNavigator styled.div, minus its two Material base-class rules. */
    .tab-navigator {
      flex: 1;
      height: auto;
    }

    /* was the TabsContainer styled.div. */
    .tabs-container {
      display: flex;
      align-items: center;
      background-color: var(--keep-surface-accent);
      padding-bottom: 21px;
    }

    /* was a span carrying weight-400, color-text-primary and medium-font — the last of
       which no stylesheet in the tree defines, so only the first two ever applied. */
    .mode-label {
      font-weight: 400;
      color: var(--wa-color-text-normal);
    }

    /* was .access-change-mode-button on a Material Button plus the .change-mode-svg-btn
       caret button next to it. See the class note on why they are one control. */
    .mode-trigger {
      display: flex;
      align-items: center;
      justify-content: left;
      gap: 4px;
      padding: 6px 8px;
      border: 0;
      background: none;
      font: inherit;
      font-size: 16px;
      color: var(--wa-color-text-normal);
      text-transform: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
    }

    .mode-trigger .caret {
      font-size: var(--wa-font-size-xl);
    }

    /* was .access-actions-container */
    .actions {
      flex: 1 0 0%;
      display: flex;
      padding: 0 20px;
      justify-content: flex-end;
      gap: 20px;
    }

    /* was .mode-buttons, plus .tabs-access-save-button which declared the same two rules
       again for the Save button alone. */
    .mode-button {
      display: flex;
      align-items: center;
      padding: 0;
      border: none;
      background: none;
      font: inherit;
      color: var(--wa-color-text-normal);
      cursor: pointer;
    }

    .mode-button:disabled {
      cursor: default;
    }

    /* was small-text plus weight-400 on the caption span of every action button. */
    .caption {
      font-size: 14px;
      font-weight: 400;
      color: var(--wa-color-text-normal);
    }

    .caption.disabled {
      color: var(--text-color-disabled);
    }

    /* was .tabs-access-action-icon. Clone and Save also carried a 5px flex gap that Add and
       Delete did not; the four line up on the icon's own margin now. */
    .action-icon {
      font-size: 16px;
      margin-right: 5px;
      padding: 0;
    }

    /*
     * was .tabs-access-delete-icon. This is the one button in the row whose class list
     * omitted color-text-primary, so the glyph could not inherit its colour and the rule
     * had to state it. Kept as a declaration for the same reason.
     */
    .delete-icon {
      color: var(--wa-color-text-normal);
    }

    /*
     * was .tabs-access-save-icon. The glyph sat at 0.9em where the other three sit at 1em,
     * and that em resolved against the 16px the shared icon rule sets on the very same
     * element. Written as an em here it would resolve against the button instead, so the
     * product is spelled out.
     */
    .save-icon {
      font-size: 14.4px;
    }

    .save-icon-enabled {
      color: var(--wa-color-text-normal);
    }

    /* was .tabs-access-save-icon-disabled. Not the disabled-text token — this grey is its
       own value and the sheet said so. */
    .save-icon-disabled {
      color: #a7a8a9;
    }

    /* was .access-load-tab-container with the flex and flex-col utilities. */
    .fields-container {
      display: flex;
      flex-direction: column;
      height: 92%;
    }

    /* was the w-50vw utility on the div wrapping the test form inside the drawer. */
    .drawer-body {
      width: 50vw;
    }
  `;

  /**
   * The whole slice: `newForm` drives what the buttons allow and `scopes` gates the formula
   * run. One subscription for both, and `Object.is` on the slice compares no fewer
   * references than a projection built fresh on every store change would.
   */
  private readonly db = new StoreController(this, (state) => state.databases);

  /** Whether the Test Formulas drawer is open. A primitive, so the identity check is exact. */
  private readonly drawerOpen = new StoreController(
    this,
    (state) => state.drawer.applicationDrawer,
  );

  /** The mode's field lists, keyed by droppable id. Owned by the screen above. */
  @property({ attribute: false }) accessor state: KeepModeFieldState = {};

  /** Every mode of the form being edited. Owned by the screen above. */
  @property({ attribute: false }) accessor modes: KeepAccessTabMode[] = [];

  /** Which of {@link modes} is being edited. */
  @property({ type: Number }) accessor currentModeIndex = 0;

  /** Which field of the current mode is selected. Passed straight through. */
  @property({ type: Number }) accessor fieldIndex = 0;

  /** The schema this form belongs to, as last fetched. */
  @property({ attribute: false }) accessor schemaData: Database | null = null;

  /** Database path segment of the route. Half of the scope lookup. */
  @property({ type: String }) accessor nsfPath = '';

  /** Schema name segment of the route. The other half. */
  @property({ type: String }) accessor schemaName = '';

  /** Form name segment of the route — the form whose modes these are. */
  @property({ type: String }) accessor formName = '';

  /**
   * A dialog to open as soon as this element exists, stashed by the screen above.
   *
   * Saving shows a full-panel spinner, which destroys this element and builds a new one, so
   * an "add mode after saving" intent cannot be held here. It is handed up as
   * `post-save-action` before the save and read back on the next `firstUpdated`.
   */
  @property({ attribute: false }) accessor postSaveAction: 'add' | 'clone' | null = null;

  /** The app's one router. Only used to leave the page after a new form is created. */
  @property({ attribute: false }) accessor router: Router | null = null;

  /**
   * Adds a field to the mode and answers with the reason it could not, or an empty string.
   * Passed through to `keep-mode-fields`, which documents why this one is not an event.
   *
   * The screen above must hand over a **bound** function — `keep-mode-fields` calls it from
   * its own template, so a plain method would run with `this` pointing at that element.
   */
  @property({ attribute: false }) accessor addField: (
    from: string,
    item: KeepFieldItem,
  ) => string = () => '';

  /** The current mode's script settings. Seeded from the mode, edited here. */
  @state() private accessor scripts: KeepScriptData = {};

  /** The current mode's required field names. */
  @state() private accessor required: string[] = [];

  /** The current mode's validation rules. */
  @state() private accessor validationRules: KeepValidationRule[] = [];

  /** The mode name shown on the picker. Tracks the selection, including across a save. */
  @state() private accessor currentModeValue = '';

  /** Whether the add-mode dialog is cloning the current mode rather than adding a blank one. */
  @state() private accessor cloneMode = false;

  /** Whether the mode has at least one field, which is what a brand-new form needs to save. */
  @state() private accessor saveEnabled = false;

  /** Text in the add-mode dialog's field, mirrored up from it on every keystroke. */
  @state() private accessor modeText = '';

  /** Validation message shown inside the add-mode dialog. */
  @state() private accessor formError = '';

  @state() private accessor newModeOpen = false;

  /** Whether the unsaved-changes dialog is up, i.e. whether an action is stashed. */
  @state() private accessor pendingOpen = false;

  /** The five formula texts handed to the drawer, gathered when it opens. */
  @state() private accessor readFormulaText = '';
  @state() private accessor writeFormulaText = '';
  @state() private accessor deleteFormulaText = '';
  @state() private accessor loadFormulaText = '';
  @state() private accessor saveFormulaText = '';

  /**
   * The dirty flag, mirrored locally.
   *
   * The store holds the copy the navigation guard reads; this one is read synchronously by
   * the action handlers, which have to decide whether to stash *before* any render.
   */
  private dirty = false;

  /**
   * False while the element is settling — mounting, or switching mode — so the cascade of
   * assignments that seeds a mode does not read as the user editing it.
   */
  private userEditing = false;

  private dirtyTimer?: ReturnType<typeof setTimeout>;

  /** Deferred callbacks, tracked so a disconnect cannot leave one to fire into nothing. */
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  /** The action held back by the unsaved-changes dialog, and what kind it is. */
  private pendingAction: (() => void) | null = null;
  private pendingModeName: string | null = null;
  private pendingActionType: 'add' | 'clone' | null = null;

  /** The mode's values as they were loaded, so reverting an edit clears the dirty flag. */
  private snapshot: {
    scripts: KeepScriptData;
    required: string[];
    validationRules: KeepValidationRule[];
    fields: Array<Record<string, unknown>>;
  } | null = null;

  /** What the seeding step last ran against — the two dependencies it used to have. */
  private seenModes: KeepAccessTabMode[] | undefined;
  private seenIndex: number | undefined;

  connectedCallback(): void {
    super.connectedCallback();
    // The navigation guard's dialog calls whatever is registered here. An arrow field, so
    // it stays bound to this element however it is invoked.
    setSaveFunction(this.save);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    setSaveFunction(null);
    if (this.dirtyTimer) clearTimeout(this.dirtyTimer);
    this.dirtyTimer = undefined;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }

  /**
   * Seed the editable copy of the mode. Was two effects on `[modes, currentModeIndex]` and
   * two more on `[currentModeIndex]`; the remembered pair below is those dependency arrays,
   * compared the same way a dependency array is.
   */
  protected willUpdate(changed: PropertyValues): void {
    // Derived here rather than in `updated()`: a reactive write in `willUpdate` folds into
    // the render already scheduled, where one in `updated()` asks for a second one.
    if (changed.has('state')) this.saveEnabled = this.strippedFields().length > 0;
    const indexChanged = this.currentModeIndex !== this.seenIndex;
    const modesChanged = this.modes !== this.seenModes;
    if (!indexChanged && !modesChanged) return;
    this.seenIndex = this.currentModeIndex;
    this.seenModes = this.modes;

    const mode = this.modes[this.currentModeIndex];
    if (indexChanged) {
      this.currentModeValue = mode?.modeName ?? '';
      // Mounting and switching both fan out into several assignments; none of them is a
      // user edit, so tracking is paused until they have settled.
      this.pauseDirtyTracking();
    }
    // An index that outran the list is a no-op rather than a crash — this element's own
    // index can outlive the mode it pointed at, which is the #928 failure shape.
    if (!mode) return;

    const scripts: KeepScriptData = {
      computeWithForm: mode.computeWithForm,
      readAccessFormula: mode.readAccessFormula,
      writeAccessFormula: mode.writeAccessFormula,
      deleteAccessFormula: mode.deleteAccessFormula,
      onLoad: mode.onLoad,
      onSave: mode.onSave,
      sign: mode.sign,
      continueOnError: mode.continueOnError,
    };
    this.scripts = scripts;
    this.required = mode.required;
    this.validationRules = mode.validationRules;
    this.snapshot = {
      scripts,
      required: mode.required,
      validationRules: mode.validationRules,
      fields: this.strippedFields(),
    };
  }

  protected firstUpdated(): void {
    const action = this.postSaveAction;
    if (!action) return;
    // Clear it up top first: this element is rebuilt on every save, and a stale intent would
    // reopen the dialog after the next one.
    this.emit<KeepPostSaveActionDetail>('post-save-action', { action: null });
    this.later(() => {
      if (action === 'clone') this.cloneMode = true;
      this.newModeOpen = true;
      this.formError = '';
      this.modeText = '';
    }, 300);
  }

  protected updated(changed: PropertyValues): void {
    if (
      changed.has('scripts') ||
      changed.has('required') ||
      changed.has('validationRules')
    ) {
      this.reportSettingsDirty();
    }
    if (changed.has('state')) this.reportFieldsDirty();
  }

  /* ---------------------------------------------------------------- *
   *  Dirty tracking                                                    *
   * ---------------------------------------------------------------- */

  /**
   * The mode's fields, undecorated. Only the first key is read, which is what every decision
   * on this screen has always done — the map shape is what is left of a two-column layout.
   *
   * The `?? []` is not decoration: the original indexed the map by `Object.keys(state)[0]`
   * and called `.map` on the result, so an empty map threw. Same family as #928.
   */
  private strippedFields(): Array<Record<string, unknown>> {
    const key = Object.keys(this.state)[0];
    const list = key === undefined ? [] : (this.state[key] ?? []);
    return list.map((field) => undecorated(field as Record<string, unknown>));
  }

  private setDirty(dirty: boolean): void {
    this.dirty = dirty;
    this.db.dispatch(setNavigationDirty(dirty));
  }

  /**
   * Hold dirty tracking off for `ms`, cancelling any earlier hold so the **last** one wins.
   * Without that an earlier timer re-enables tracking while a later cascade is still landing.
   */
  private pauseDirtyTracking(ms = 500): void {
    this.userEditing = false;
    if (this.dirtyTimer) clearTimeout(this.dirtyTimer);
    this.dirtyTimer = setTimeout(() => {
      this.userEditing = true;
      this.dirtyTimer = undefined;
    }, ms);
  }

  /** Run `fn` later, and forget the timer if this element goes away first. */
  private later(fn: () => void, ms: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, ms);
    this.timers.add(timer);
  }

  /** Whether the mode's fields differ from the copy taken when it was loaded. */
  private fieldsDirty(): boolean {
    const snapshot = this.snapshot;
    return snapshot !== null && !same(this.strippedFields(), snapshot.fields);
  }

  /** Compared against the load-time copy, so reverting an edit clears the flag. */
  private reportSettingsDirty(): void {
    const snapshot = this.snapshot;
    if (!this.userEditing || !snapshot) return;
    this.setDirty(
      !same(this.scripts, snapshot.scripts) ||
        !same(this.required, snapshot.required) ||
        !same(this.validationRules, snapshot.validationRules) ||
        this.fieldsDirty(),
    );
  }

  /** The same comparison, run when the field list rather than the settings changed. */
  private reportFieldsDirty(): void {
    const snapshot = this.snapshot;
    if (!this.userEditing || !snapshot) return;
    const fields = this.strippedFields();
    this.setDirty(
      !same(fields, snapshot.fields) ||
        !same(this.scripts, snapshot.scripts) ||
        !same(this.required, snapshot.required) ||
        !same(this.validationRules, snapshot.validationRules),
    );
  }

  /* ---------------------------------------------------------------- *
   *  The unsaved-changes gate                                          *
   * ---------------------------------------------------------------- */

  /** Run `action`, or hold it behind the dialog when there is unsaved work. */
  private guardAction(
    action: () => void,
    targetModeName?: string,
    actionType?: 'add' | 'clone',
  ): void {
    if (!this.dirty) {
      action();
      return;
    }
    this.pendingAction = action;
    this.pendingModeName = targetModeName ?? null;
    this.pendingActionType = actionType ?? null;
    this.pendingOpen = true;
  }

  private clearPending(): void {
    this.pendingAction = null;
    this.pendingModeName = null;
    this.pendingActionType = null;
    this.pendingOpen = false;
  }

  private readonly handlePendingSave = async (): Promise<void> => {
    const targetMode = this.pendingModeName;
    const actionType = this.pendingActionType;
    this.clearPending();

    // Add and clone survive the save spinner in the screen above, because this element does
    // not: it is destroyed and rebuilt while the panel shows the spinner.
    if (!targetMode && actionType) {
      this.emit<KeepPostSaveActionDetail>('post-save-action', { action: actionType });
    }

    try {
      await this.save();
    } catch (error) {
      // Caught so the switch still happens: a failed save must not leave the user stuck on
      // a dialog that has already closed.
      log.error('Save failed', error as Error);
    }
    this.setDirty(false);
    this.pauseDirtyTracking();

    if (!targetMode) return;
    // Deferred so the renders the server response sets off — schema, then modes — have all
    // landed before the index is moved.
    this.later(() => {
      const index = this.modes.findIndex((mode) => mode.modeName === targetMode);
      if (index < 0) return;
      this.currentModeValue = targetMode;
      this.emit<KeepModeIndexChangeDetail>('mode-index-change', { index });
      this.emit<KeepPageIndexChangeDetail>('page-index-change', { index });
      this.emit<KeepFieldIndexChangeDetail>('field-index-change', { fieldIndex: 0 });
    }, 300);
  };

  private readonly handlePendingDiscard = (): void => {
    const stashed = this.pendingAction;
    const isModeSwitch = this.pendingModeName !== null;

    const mode = this.modes[this.currentModeIndex];
    if (mode) {
      this.scripts = {
        computeWithForm: mode.computeWithForm,
        readAccessFormula: mode.readAccessFormula,
        writeAccessFormula: mode.writeAccessFormula,
        deleteAccessFormula: mode.deleteAccessFormula,
        onLoad: mode.onLoad,
        onSave: mode.onSave,
        sign: mode.sign,
        continueOnError: mode.continueOnError,
      };
      this.required = mode.required;
      this.validationRules = mode.validationRules;
    }
    // The fields live above this element, so reverting them is a reseed of the same mode.
    this.emit<KeepPageIndexChangeDetail>('page-index-change', { index: this.currentModeIndex });

    this.pauseDirtyTracking();
    this.setDirty(false);
    this.clearPending();

    if (!stashed) return;
    if (isModeSwitch) {
      stashed();
      return;
    }
    // Add and clone open a modal, so the dialog that is closing has to finish first.
    this.later(stashed, 300);
  };

  private readonly handlePendingCancel = (): void => {
    this.clearPending();
  };

  /* ---------------------------------------------------------------- *
   *  Mode picker                                                       *
   * ---------------------------------------------------------------- */

  /**
   * One listener on the dropdown, never a click per item (#925): Web Awesome only
   * synthesises a click for pointer selection, so a per-item handler is dead for anyone
   * using the keyboard — and still fires on a disabled item.
   */
  private handleModeSelect(event: Event): void {
    event.stopPropagation();
    const { item } = (event as CustomEvent<{ item: { value: string } }>).detail;
    this.selectMode(item.value);
  }

  private selectMode(value: string): void {
    // Choosing the mode already on screen is a no-op, dirty or not.
    if (value === this.currentModeValue) return;
    this.guardAction(() => {
      const index = this.modes.findIndex((mode) => mode.modeName === value);
      if (index < 0) return;
      this.currentModeValue = value;
      this.emit<KeepModeIndexChangeDetail>('mode-index-change', { index });
      this.emit<KeepPageIndexChangeDetail>('page-index-change', { index });
      this.emit<KeepFieldIndexChangeDetail>('field-index-change', { fieldIndex: 0 });
    }, value);
  }

  /* ---------------------------------------------------------------- *
   *  Saving                                                            *
   * ---------------------------------------------------------------- */

  private readonly handleSchemaData = (schemaData: Database): void => {
    this.emit<KeepSchemaDataChangeDetail>('schema-data-change', { schemaData });
  };

  /** Everything the server needs for this mode, gathered off the page. */
  private gatherFormData(): Record<string, unknown> {
    return {
      modeName: this.modes[this.currentModeIndex]?.modeName ?? '',
      ...this.scripts,
      fields: this.strippedFields(),
      strictInput: true,
      required: this.required,
      validationRules: this.validationRules,
    };
  }

  /**
   * Save the mode. Registered with the navigation guard, so it is also what the "you have
   * unsaved changes" dialog calls when the user chooses to save and leave.
   *
   * Two shapes: a form that does not exist on the server yet is written as a whole new
   * schema and the user is sent back to the schema; an existing one is a mode update.
   */
  private readonly save = async (): Promise<void> => {
    const schemaData = this.schemaData;
    const { newForm } = this.db.value;
    if (!schemaData) return;
    // A brand-new form with no fields cannot be written, and the button says so.
    if (newForm.enabled && !this.saveEnabled) return;

    const formData = this.gatherFormData();

    if (newForm.form) {
      const fields = formData.fields as Array<Record<string, unknown>>;
      const newSchema = {
        ...schemaData,
        forms: [
          ...schemaData.forms,
          {
            formName: newForm.form.formName,
            formValue: newForm.form.formName,
            alias: [newForm.form.formName],
            formModes: [
              {
                modeName: 'default',
                fields: fields.map((field) => ({
                  externalName: field.name,
                  fieldAccess: field.fieldAccess,
                  fieldGroup: '',
                  format: field.format,
                  itemFlags: ['SUMMARY'],
                  name: field.name,
                  protectedField: false,
                  summaryField: true,
                  type: field.type,
                })),
                computeWithForm: false,
                readAccessFormula: { formulaType: 'domino', formula: '@True' },
                writeAccessFormula: { formulaType: 'domino', formula: '@True' },
                deleteAccessFormula: { formulaType: 'domino', formula: '@False' },
                onLoad: { formulaType: 'domino', formula: '' },
                onSave: { formulaType: 'domino', formula: '' },
                sign: false,
                required: this.required,
                validationRules: this.validationRules,
              },
            ],
          },
        ],
      };
      void this.db.dispatch(updateSchema(newSchema, this.handleSchemaData));
      this.setDirty(false);
      this.router?.navigate(
        `/schema/${encodeURIComponent(this.nsfPath)}/${this.schemaName}`,
      );
      return;
    }

    const target = schemaData.forms
      .filter((form) => form.formModes.length > 0)
      .find((form) => form.formName === this.formName);
    // A schema that does not carry this form is a no-op rather than a crash. The original
    // indexed the filter result directly and threw here — same family as #928.
    if (!target) return;
    const { formModes } = target;
    const originalIndex = formModes.findIndex(
      (mode) => mode.modeName === this.currentModeValue,
    );
    this.emit<KeepModeIndexChangeDetail>('mode-index-change', { index: originalIndex });
    await this.db.dispatch(
      updateFormMode(
        schemaData,
        this.formName,
        [],
        formData,
        -1,
        this.cloneMode,
        this.handleSchemaData,
      ),
    );
    // Everything is re-read from the server response; this only restores the picker's label.
    const restored = formModes[originalIndex];
    if (restored) this.currentModeValue = restored.modeName;
    this.setDirty(false);
    // The re-fetch cascade that follows a save is not the user editing.
    this.pauseDirtyTracking();
  };

  /* ---------------------------------------------------------------- *
   *  Mode actions                                                      *
   * ---------------------------------------------------------------- */

  private handleDeleteClick(): void {
    this.db.dispatch(toggleDeleteDialog());
  }

  private handleDeleteMode(): void {
    const schemaData = this.schemaData;
    const mode = this.modes[this.currentModeIndex];
    if (!schemaData || !mode) return;
    void this.db.dispatch(
      deleteFormMode(schemaData, this.formName, mode.modeName, this.handleSchemaData),
    );
    this.emit<KeepModeIndexChangeDetail>('mode-index-change', { index: 0 });
  }

  private handleAddModeClick(): void {
    this.guardAction(
      () => {
        this.newModeOpen = true;
        this.formError = '';
        this.modeText = '';
      },
      undefined,
      'add',
    );
  }

  private handleCloneModeClick(): void {
    this.guardAction(
      () => {
        this.cloneMode = true;
        this.newModeOpen = true;
      },
      undefined,
      'clone',
    );
  }

  private handleModeNameChange(event: CustomEvent<string>): void {
    this.modeText = event.detail;
    this.formError = '';
  }

  private handleAddModeClose(): void {
    this.newModeOpen = false;
    this.cloneMode = false;
  }

  private async handleAddModeSave(): Promise<void> {
    if (isEmptyOrSpaces(this.modeText)) {
      this.formError = 'Mode Name is Required.';
      return;
    }
    const name = this.modeText.trim();
    if (verifyModeName(name)) {
      this.formError =
        'This field can only contains digits, letters, underscores and spaces, but no space at the beginning or end';
      return;
    }
    if (this.modes.some((mode) => mode.modeName === name)) {
      this.formError = 'Mode Already Exist.';
      return;
    }
    const schemaData = this.schemaData;
    if (!schemaData) return;

    const current = this.modes[this.currentModeIndex];
    const formModeData =
      this.cloneMode && current
        ? { ...current, modeName: name }
        : {
            modeName: name,
            fields: [],
            readAccessFormula: { formulaType: 'domino', formula: '@True' },
            writeAccessFormula: { formulaType: 'domino', formula: '@True' },
            deleteAccessFormula: { formulaType: 'domino', formula: '@False' },
            computeWithForm: false,
          };

    await this.db.dispatch(
      updateFormMode(
        schemaData,
        this.formName,
        [],
        formModeData,
        -1,
        this.cloneMode,
        this.handleSchemaData,
      ),
    );
    this.currentModeValue = this.modeText;
    this.newModeOpen = false;
    this.cloneMode = false;
  }

  /* ---------------------------------------------------------------- *
   *  Test formulas                                                     *
   * ---------------------------------------------------------------- */

  /**
   * Gather the mode's formulas and open the drawer over them.
   *
   * The guard is a fact about the page rather than about a field — a schema with no scope
   * has nothing to run a formula against — so it is refused with an alert here rather than
   * five requests that all fail.
   */
  private handleTestFormulas(): void {
    const scopeIndex = findScopeBySchema(this.db.value.scopes, this.schemaName, this.nsfPath);
    if (scopeIndex < 0) {
      this.db.dispatch(
        toggleAlert(
          'Only schemas configured with scopes support this feature. Please configure this schema with a scope first.',
        ),
      );
      return;
    }
    const scripts = this.scripts;
    this.readFormulaText = scripts.readAccessFormula?.formula ?? '';
    this.writeFormulaText = scripts.writeAccessFormula?.formula ?? '';
    this.deleteFormulaText = scripts.deleteAccessFormula?.formula ?? '';
    this.loadFormulaText = scripts.onLoad?.formula ?? '';
    this.saveFormulaText = scripts.onSave?.formula ?? '';
    this.db.dispatch(toggleApplicationDrawer());
  }

  /* ---------------------------------------------------------------- *
   *  Render                                                            *
   * ---------------------------------------------------------------- */

  private renderModePicker() {
    const sorted = [...this.modes].sort((a, b) => (a.modeName > b.modeName ? 1 : -1));
    return html`
      <wa-dropdown @wa-select=${this.handleModeSelect}>
        <button class="mode-trigger" slot="trigger" type="button" aria-label="Select Mode">
          <span>${this.currentModeValue}</span>
          <wa-icon
            class="caret"
            library=${FA_LIBRARY}
            name="caret-down"
            canvas="auto"
          ></wa-icon>
        </button>
        ${sorted.map(
          (mode) =>
            html`<wa-dropdown-item value=${mode.modeName}>${mode.modeName}</wa-dropdown-item>`,
        )}
      </wa-dropdown>
    `;
  }

  private renderActions() {
    const disabled = this.db.value.newForm.enabled;
    const modeName = this.modes[this.currentModeIndex]?.modeName ?? '';
    // A form that already exists can always be saved; a brand-new one needs a field first.
    const saveActive = !disabled || this.saveEnabled;

    return html`
      <div class="actions">
        <button
          type="button"
          class="mode-button"
          ?disabled=${disabled}
          @click=${this.handleCloneModeClick}
        >
          <wa-icon
            class="action-icon"
            library=${FA_LIBRARY}
            name="copy"
            canvas="auto"
          ></wa-icon>
          <span class="caption ${disabled ? 'disabled' : ''}">Clone Mode</span>
        </button>
        <button
          type="button"
          class="mode-button"
          ?disabled=${disabled}
          @click=${this.handleAddModeClick}
        >
          <wa-icon
            class="action-icon"
            library=${FA_LIBRARY}
            name="plus"
            canvas="auto"
          ></wa-icon>
          <span class="caption ${disabled ? 'disabled' : ''}">Add Mode</span>
        </button>
        <keep-add-mode-dialog
          .open=${this.newModeOpen}
          .clone=${this.cloneMode}
          .modeName=${modeName}
          .formError=${this.formError}
          @mode-name-change=${this.handleModeNameChange}
          @dialog-save=${() => void this.handleAddModeSave()}
          @dialog-close=${this.handleAddModeClose}
        ></keep-add-mode-dialog>
        ${modeName !== 'default'
          ? html`
              <button type="button" class="mode-button" @click=${this.handleDeleteClick}>
                <wa-icon
                  class="action-icon delete-icon"
                  library=${FA_LIBRARY}
                  name="trash"
                  canvas="auto"
                ></wa-icon>
                <span class="caption ${disabled ? 'disabled' : ''}">Delete Mode</span>
              </button>
              <keep-confirm-delete-dialog
                heading="Delete Mode"
                message="Are you sure you want to delete this Mode?"
                @confirm-delete=${this.handleDeleteMode}
              ></keep-confirm-delete-dialog>
            `
          : nothing}
        <button type="button" class="mode-button" @click=${() => void this.save()}>
          <wa-icon
            class="action-icon save-icon ${saveActive
              ? 'save-icon-enabled'
              : 'save-icon-disabled'}"
            library=${FA_LIBRARY}
            name="floppy-disk"
            canvas="auto"
          ></wa-icon>
          <span class="caption ${saveActive ? '' : 'disabled'}">Save</span>
        </button>
      </div>
    `;
  }

  render() {
    return html`
      <div class="tab-navigator">
        <div class="tabs-container">
          <span class="mode-label">Mode: </span>
          ${this.renderModePicker()} ${this.renderActions()}
        </div>
        <div class="fields-container">
          <!-- fields-remove, field-index-change and field-update are not bound here: they
               belong to the screen above, and every emit crosses this boundary already, so
               re-emitting them would deliver each edit twice. -->
          <keep-mode-fields
            .state=${this.state}
            .addField=${this.addField}
            .scripts=${this.scripts}
            .required=${this.required}
            .validationRules=${this.validationRules}
            .fieldIndex=${this.fieldIndex}
            @required-change=${(event: CustomEvent<{ required: string[] }>) => {
              this.required = event.detail.required;
            }}
            @scripts-change=${(event: CustomEvent<{ scripts: KeepScriptData }>) => {
              this.scripts = event.detail.scripts;
            }}
            @validation-rules-change=${(
              event: CustomEvent<{ rules: KeepValidationRule[] }>,
            ) => {
              this.validationRules = event.detail.rules;
            }}
            @test-formulas=${this.handleTestFormulas}
          ></keep-mode-fields>
        </div>
      </div>
      <keep-drawer .open=${this.drawerOpen.value} label="Application Form">
        <div class="drawer-body">
          <keep-test-form
            .nsfPath=${this.nsfPath}
            .schemaName=${this.schemaName}
            .readFormulaText=${this.readFormulaText}
            .writeFormulaText=${this.writeFormulaText}
            .deleteFormulaText=${this.deleteFormulaText}
            .loadFormulaText=${this.loadFormulaText}
            .saveFormulaText=${this.saveFormulaText}
          ></keep-test-form>
        </div>
      </keep-drawer>
      <keep-unsaved-changes-dialog
        .open=${this.pendingOpen}
        @dialog-save=${() => void this.handlePendingSave()}
        @dialog-discard=${this.handlePendingDiscard}
        @dialog-cancel=${this.handlePendingCancel}
      ></keep-unsaved-changes-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-access-tabs': AccessTabs;
  }
}
