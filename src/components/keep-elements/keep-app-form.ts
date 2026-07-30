/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import * as Yup from 'yup';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/textarea/textarea.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { FormController } from '../../store/FormController';
import { FA_LIBRARY } from '../../services/icon-library';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import { addApplication, updateApp } from '../../store/applications/action';
import {
  APP_ICON_NAMES,
  DEFAULT_APP_ICON_NAME,
  getAppIcons,
  loadAppIcons,
  type AppIconMap,
} from '../../services/app-icons';
import './keep-autocomplete';
import type Autocomplete from './keep-autocomplete';
import './keep-checkbox';
import type Checkbox from './keep-checkbox';
import './keep-button';

/** The values this form owns. Everything else in the request body is derived — see `buildPayload`. */
export interface AppFormValues {
  /** Empty when creating; the application being edited otherwise. */
  appId: string;
  appName: string;
  appDescription: string;
  /** One URL per line, because the API takes an array and the control is a text box. */
  appCallbackUrlsStr: string;
  appStartPage: string;
  appStatus: boolean;
  /** Comma-joined, because `openapi.core.json` validates `appScope` as a string. */
  appScope: string;
  appContactsStr: string;
  appIcon: string;
  usePkce: boolean;
}

const INITIAL_VALUES: AppFormValues = {
  appId: '',
  appName: '',
  appDescription: '',
  appCallbackUrlsStr: '',
  appStartPage: '',
  appStatus: true,
  appScope: '',
  appContactsStr: '',
  appIcon: DEFAULT_APP_ICON_NAME,
  usePkce: false,
};

/**
 * Three scopes every application may ask for, which are not in the schema list because no
 * schema defines them. Appended after the sorted list, as before.
 */
const BUILT_IN_SCOPES = ['MAIL', '$DATA', '$DECRYPT'];

/**
 * The Application form: name an OAuth client, list its callbacks and scopes, save. Tag:
 * `keep-app-form`.
 *
 * Replaces `components/applications/AppForm.tsx`.
 *
 * ### It owns its form, and it owns the submit
 *
 * The React leaf received a form object built by `Kanban`, and wrote into it by assigning
 * straight into that object's values — a mutation nothing was subscribed to, which is why the
 * pill row needed a second copy of the same list in component state to make the screen move.
 * The `FormController` here is the only copy, `setValue` is the only way in, and the pills are
 * derived from it rather than mirrored beside it.
 *
 * The `addApplication` / `updateApp` dispatch moved here with the values, for the reason
 * `keep-quick-config-form` gives: a form object handed across a shadow boundary as a property
 * keeps the coupling alive through the type after removing it from the imports.
 * **`Kanban`'s own submit handler is now unreachable**, and goes when that file converts.
 *
 * ### Seeding: the drawer is reused, so `initialValues` arrives late and more than once
 *
 * One element serves both Add and Edit, and the row being edited is pushed in by a still-React
 * ancestor after the drawer has been told to open. So the seed is applied on two triggers —
 * when the object identity changes, and on the drawer's opening edge — and both run the same
 * `reset` + `setValues` pair. Either alone leaves a hole: identity alone misses a second Add
 * in a row (nothing about the pristine values changed), and the edge alone reads whatever
 * property value happens to have arrived first.
 *
 * ### Errors appear on blur
 *
 * Every validated field wires `@blur`, so a required field reports itself when the user leaves
 * it and the first Add press reports whatever is left. The Formik markup described this and
 * never did it: `handleBlur` was wired nowhere, so `touched` only flipped on submit.
 *
 * No outbound events: Close toggles the drawer flag through the store, exactly as the React
 * leaf did, and both save thunks close the drawer themselves on success. An event would have
 * nothing listening to it until the drawer shell converts.
 */
@customElement('keep-app-form')
export default class AppForm extends KeepElement {
  static styles = css`
    /* The global reset does not cross a shadow boundary, and this layout needs it: the
       header is a fixed height with 20px of padding, and the fields are percentage-width
       with padding of their own. */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    /* Was the FormContentContainer styled.div. The w-90 utility beside it never applied —
       the styled block sets width on the same specificity and is injected later — so the
       90% belongs to the form below, which is where the markup also asked for it. */
    :host {
      display: block;
      padding: 0 20px;
      min-width: 55%;
      max-width: 100%;
      width: 100%;
      overflow-y: auto;
    }

    /* Was the PanelContent styled.form plus the flex, flex-col and w-90 utilities.
       margin: 0 because some UA stylesheets give a form a bottom margin, which would push
       the column past the drawer. */
    .panel-content {
      margin: 0;
      padding: 20px 0;
      display: flex;
      flex-direction: column;
      width: 90%;
    }

    /*
     * Was the app-form-header class plus background-keep-base and full-width. A heading
     * element rather than a span: it names the panel, and the drawer's own title is the only
     * other heading in here.
     *
     * The fill is the brand surface token, which keep-theme.css measures against white in
     * both modes; the literal it replaces was a hardcoded white on a hardcoded background.
     */
    .form-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: var(--wa-color-brand-on-loud, #fff);
      background: var(--keep-surface-brand);
      font-size: 24px;
      font-weight: normal;
      padding: 20px;
      height: 70px;
      border-radius: var(--wa-border-radius-m);
      width: 100%;
    }

    /* Was the InputContainer styled.div. */
    .input-container {
      padding: 5px 0;
    }

    .input-container.first {
      margin-top: 5px;
    }

    /* Was the fullWidth prop on every field. */
    wa-input,
    wa-textarea,
    keep-autocomplete {
      display: block;
      width: 100%;
    }

    /* Was the small-text and color-text-danger utilities. The token is mode-aware; the
       class behind the second one resolves through a variable that does not reach in here. */
    .field-error {
      display: block;
      color: var(--keep-color-danger-text);
      font-size: 14px;
    }

    /* Was the PillBoxRow styled.div. */
    .pill-row {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      justify-content: left;
    }

    /* Was the PillBox styled.div. */
    .pill {
      display: flex;
      flex-direction: row;
      align-items: center;
      border: 1px solid var(--wa-color-surface-border);
      border-radius: var(--wa-border-radius-l);
      padding: 2px 10px;
      margin: 0 2px 1px 0;
      color: var(--wa-color-text-normal);
    }

    .pill:hover {
      background: var(--wa-color-brand-50);
      color: var(--wa-color-brand-on-loud, #fff);
    }

    /*
     * Was the RemoveButton styled.div, which had a click handler on a div: not focusable,
     * no role, unreachable from the keyboard. It is a button here and its accessible name
     * names the scope it removes.
     *
     * The height and weight declarations from the original are dropped: weight is not a
     * property, and the 5px height clipped nothing because the glyph sets the line box.
     */
    .pill-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 10px 2px;
      padding: 0;
      border: none;
      background: none;
      color: inherit;
      font-size: inherit;
      cursor: pointer;
    }

    /* Was the ScopeField styled.div. */
    .scope-field {
      display: flex;
      flex-direction: row;
      gap: 30px;
      align-items: center;
      margin-top: 10px;
    }

    /* Was the half-width utility on the autocomplete. */
    .scope-field keep-autocomplete,
    .icon-select {
      width: 50%;
    }

    .checkbox-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }

    /* Was the ActionButtonBar styled.div. */
    .actions {
      margin-top: 0;
      border-top: 2px solid var(--wa-color-brand-50);
      padding-top: 15px;
      padding-bottom: 15px;
      display: flex;
      flex-wrap: wrap;
      row-gap: 10px;
      gap: 10px;
    }

    /* Was the button-style class, whose float did nothing: it was applied to flex items. */
    .actions keep-button {
      width: 25%;
    }

    /* The plus button carries no visible text, so its name is here instead of nowhere. */
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }
  `;

  /** The scope list offered by the autocomplete. A slice field, so `Object.is` narrows it. */
  private readonly scopes = new StoreController(this, (state) => state.databases.scopes);

  /** Drives the seed: the drawer's opening edge clears whatever the last visit left behind. */
  private readonly drawer = new StoreController(
    this,
    (state) => state.drawer.applicationDrawer,
  );

  private readonly form = new FormController<AppFormValues>(this, {
    initialValues: INITIAL_VALUES,
    schema: buildSchema(),
    onSubmit: (values) => this.save(values),
  });

  /**
   * Whether this visit is an edit. Set by the React ancestors through a context, which no
   * element can read — so it crosses as a property until they convert.
   */
  @property({ type: String }) accessor formContext = '';

  /**
   * The row to edit, or the pristine values for an add. Read only when it changes, never
   * written to: `@lit/react` re-applies every property on every parent render with no dirty
   * check, so anything this element wrote back here would be overwritten on the next render.
   */
  @property({ attribute: false }) accessor initialValues: Partial<AppFormValues> | undefined;

  /** The 86 icon payloads, once the lazy chunk (#772) lands. Empty until then. */
  @state() private accessor icons: AppIconMap = getAppIcons();

  @query('#scope-input') private accessor scopeInput!: Autocomplete | null;

  /** Identity of the last applied seed, so an unchanged property is not re-applied. */
  private seeded: Partial<AppFormValues> | undefined;

  /** Previous drawer flag, so the seed sees the edge rather than the level. */
  private wasOpen = false;

  connectedCallback(): void {
    super.connectedCallback();
    void loadAppIcons().then(
      (icons) => {
        this.icons = icons;
      },
      () => {
        /* the autocomplete hides its icon column while the map is empty; nothing to retry */
      },
    );
  }

  /**
   * `willUpdate`, not `updated`: seeding writes to the controller, which requests another
   * update. Done after the render that is a second pass and a console warning; done before it,
   * the new values are part of the render that is already happening.
   *
   * The drawer flag is compared explicitly rather than looked up in `changedProperties`,
   * because it arrives from a `StoreController`, which drives re-renders with a bare
   * `requestUpdate()` and so puts nothing in that map.
   */
  protected willUpdate(): void {
    const opened = this.drawer.value && !this.wasOpen;
    this.wasOpen = this.drawer.value;
    if (this.initialValues !== this.seeded) {
      this.seeded = this.initialValues;
      this.applySeed();
    } else if (opened) {
      this.applySeed();
    }
  }

  /**
   * Load the seed into the form.
   *
   * `reset` then `setValues` rather than one call, because `FormController` fixes its
   * `initialValues` at construction: there is no way to tell it that the form is now standing
   * for a different row. `reset` is what clears `errors`, `touched` and `submitted` from the
   * previous visit; `setValues` puts the new row in on top of the blanks it just restored.
   * A later bare `reset()` would therefore go back to blank rather than to this row — which
   * nothing here does, but it is the gap: `reset(next?)` would be the whole fix.
   */
  private applySeed(): void {
    this.form.reset();
    if (this.initialValues) this.form.setValues({ ...this.initialValues });
  }

  /** The scopes already chosen. Derived from form state — there is no second copy. */
  private get scopeValues(): string[] {
    const raw = this.form.values.appScope;
    return raw ? raw.split(',') : [];
  }

  /**
   * What is left to choose: every schema's scope that is not already a pill, sorted, then the
   * three built-ins.
   *
   * The React version derived the pills from `appScope` **only when the context said Edit**,
   * and from a `&&` expression that yields `false` rather than an empty array when the string
   * is empty — so an Edit of an application with no scopes put `false` into the list state and
   * the next `.includes` call threw. Deriving from the value has no such state to get wrong.
   */
  private get scopeOptions(): string[] {
    const chosen = this.scopeValues;
    const fromSchemas = this.scopes.value
      .map((scope: { apiName: string }) => scope.apiName)
      .filter((name: string) => !chosen.includes(name))
      .sort();
    return [...fromSchemas, ...BUILT_IN_SCOPES.filter((name) => !chosen.includes(name))];
  }

  private setScopes(next: string[]): void {
    // Comma-joined, because openapi.core.json validates appScope as a string.
    this.form.setValue('appScope', next.join(','));
  }

  /**
   * Add whatever the scope box currently holds.
   *
   * The React version reached through the autocomplete's shadow root for its inner input.
   * `selectedOption` is that value — the element assigns it on every keystroke — so the reach
   * is unnecessary, and the box is cleared afterwards so the text cannot sit there looking
   * unadded while a second press is silently refused as a duplicate.
   */
  private addScope(): void {
    const typed = (this.scopeInput?.selectedOption ?? '').trim();
    const chosen = this.scopeValues;
    if (typed === '' || chosen.includes(typed)) return;
    this.setScopes([...chosen, typed]);
    this.clearScopeInput();
  }

  private removeScope(scope: string): void {
    this.setScopes(this.scopeValues.filter((chosen) => chosen !== scope));
  }

  private clearScopeInput(): void {
    if (this.scopeInput) {
      this.scopeInput.selectedOption = '';
      this.scopeInput.initialOption = '';
    }
  }

  private close(): void {
    this.drawer.dispatch(toggleApplicationDrawer());
  }

  /**
   * The request body. Both thunks close the drawer and post their own alert on success, so
   * there is nothing to do afterwards.
   */
  private save(values: AppFormValues): void {
    const payload = buildPayload(values);
    if (this.formContext === 'Edit') {
      this.drawer.dispatch(updateApp({ ...payload, client_id: values.appId }));
    } else {
      this.drawer.dispatch(addApplication(payload));
    }
  }

  private submit(): void {
    this.clearScopeInput();
    void this.form.submit();
  }

  /**
   * Implicit submission — Enter in any single-line field.
   *
   * `preventDefault` because a native submit would navigate; the values live in the controller
   * rather than in the form's elements collection, so there is nothing for the browser to send.
   *
   * The scope box cannot reach this: its input lives in another element's shadow root, is not
   * form-associated, and so takes no part in this form's implicit submission. Enter there does
   * what the autocomplete makes it do — pick the highlighted option.
   */
  private handleSubmitEvent(event: Event): void {
    event.preventDefault();
    this.submit();
  }

  /**
   * `keep-checkbox` re-emits its own composed `change` with no detail, having stopped the
   * inner event, so the state is on the element and `target` is the `keep-checkbox` itself.
   */
  private checkedOf(event: Event): boolean {
    return (event.target as Checkbox).checked;
  }

  /** The display gate is `touched && errors`, so a field the user has not reached stays quiet. */
  private renderError(path: keyof AppFormValues) {
    const message = this.form.touched[path] ? this.form.errors[path] : undefined;
    // Never interpolated unconditionally: the React version rendered the key into a string,
    // which shows the user the word "undefined" whenever the field is in fact valid.
    return message ? html`<span class="field-error">${message}</span>` : nothing;
  }

  private renderTextField(
    path: 'appName' | 'appDescription' | 'appStartPage',
    label: string,
    id: string,
    first = false,
  ) {
    return html`
      <div class="input-container ${first ? 'first' : ''}">
        <wa-input
          id=${id}
          label=${label}
          autocomplete="off"
          .value=${this.form.values[path]}
          @input=${(e: Event) => this.form.setValue(path, (e.target as HTMLInputElement).value)}
          @blur=${() => void this.form.handleBlur(path)}
        ></wa-input>
        ${this.renderError(path)}
      </div>
    `;
  }

  private renderTextArea(path: 'appCallbackUrlsStr' | 'appContactsStr', label: string, id?: string) {
    return html`
      <div class="input-container">
        <wa-textarea
          id=${id ?? nothing}
          label=${label}
          rows="4"
          resize="none"
          autocomplete="off"
          .value=${this.form.values[path]}
          @input=${(e: Event) => this.form.setValue(path, (e.target as HTMLInputElement).value)}
          @blur=${() => void this.form.handleBlur(path)}
        ></wa-textarea>
        ${this.renderError(path)}
      </div>
    `;
  }

  render() {
    const { values } = this.form;
    const editing = this.formContext === 'Edit';
    return html`
      <form class="panel-content" @submit=${(e: Event) => this.handleSubmitEvent(e)}>
        <h2 class="form-header">
          <wa-icon library=${FA_LIBRARY} name="table-cells-large" canvas="auto"></wa-icon>
          <span>${editing ? 'Edit Application' : 'Add New Application'}</span>
        </h2>

        ${this.renderTextField('appName', 'Application Name', 'app-name', true)}
        ${this.renderTextField('appDescription', 'Description', 'app-description')}
        ${this.renderTextArea('appCallbackUrlsStr', 'Callback URLs (one per line)', 'callback-urls')}
        ${this.renderTextField('appStartPage', 'Startup Page', 'startup-page')}

        <div class="input-container">
          <small>Scope</small>
          <div class="pill-row">
            ${this.scopeValues.map(
              (scope) => html`
                <span class="pill">
                  <span>${scope}</span>
                  <button
                    class="pill-remove"
                    type="button"
                    aria-label="Remove ${scope}"
                    @click=${() => this.removeScope(scope)}
                  >
                    <wa-icon library=${FA_LIBRARY} name="xmark" canvas="auto"></wa-icon>
                  </button>
                </span>
              `,
            )}
          </div>
          <div class="scope-field">
            <keep-autocomplete id="scope-input" .options=${this.scopeOptions}></keep-autocomplete>
            <keep-button icon="plus" @click=${() => this.addScope()}>
              <span class="visually-hidden">Add scope</span>
            </keep-button>
          </div>
          ${this.renderError('appScope')}
        </div>

        <div class="checkbox-row">
          <keep-checkbox
            size="m"
            ?checked=${values.appStatus}
            @change=${(e: Event) => this.form.setValue('appStatus', this.checkedOf(e))}
          >
            Active
          </keep-checkbox>
        </div>

        ${this.renderTextArea('appContactsStr', 'Contacts: email or URL (one per line)')}

        <small>App Icons</small>
        <keep-autocomplete
          class="icon-select"
          .options=${APP_ICON_NAMES}
          .icons=${this.icons}
          .selectedOption=${values.appIcon}
          @change=${(e: Event) =>
            this.form.setValue('appIcon', (e.target as Autocomplete).selectedOption)}
        ></keep-autocomplete>

        <div class="checkbox-row">
          <keep-checkbox
            size="m"
            ?checked=${values.usePkce}
            @change=${(e: Event) => this.form.setValue('usePkce', this.checkedOf(e))}
          >
            Use PKCE
          </keep-checkbox>
        </div>

        <!-- The form's only submitter, so Enter in a field reaches the submit handler.
             Neither keep-button nor its inner Web Awesome button is form-associated, and an
             input's implicit submission walks the form's elements collection looking for an
             enabled submit control - with none, Enter did nothing at all. -->
        <button type="submit" hidden aria-hidden="true" tabindex="-1"></button>
      </form>
      <div class="actions">
        <keep-button @click=${() => this.close()}>Close</keep-button>
        <keep-button ?disabled=${this.form.submitting} @click=${() => this.submit()}>
          ${editing ? 'Update' : 'Add'}
        </keep-button>
      </div>
    `;
  }
}

/**
 * The four rules `Kanban` declared, moved here with the values they validate.
 *
 * A plain function rather than a method: nothing in it reads the element, unlike Quick
 * Config's two "already exists" rules.
 */
function buildSchema(): Yup.AnyObjectSchema {
  return Yup.object().shape({
    appName: Yup.string().trim().required('Application Name is Required.'),
    appCallbackUrlsStr: Yup.string().required('At least one URL is required.'),
    appStartPage: Yup.string().required('Startup page is required.'),
    appScope: Yup.string().required('Scope is required.'),
  }) as Yup.AnyObjectSchema;
}

/**
 * The request body. The two multi-line fields become arrays with their blank lines dropped;
 * everything else is a rename.
 */
export function buildPayload(values: AppFormValues) {
  const lines = (text: string) =>
    (text ?? '').split(/\n/).filter((line: string) => line.trim() !== '');
  return {
    client_name: values.appName.trim(),
    description: values.appDescription ?? '',
    redirect_uris: lines(values.appCallbackUrlsStr),
    client_uri: values.appStartPage,
    scope: values.appScope,
    logo_uri: values.appIcon,
    status: values.appStatus ? 'isActive' : 'disabled',
    contacts: lines(values.appContactsStr),
    token_endpoint_auth_method: values.usePkce ? 'none' : 'client_secret_basic',
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-app-form': AppForm;
  }
}
