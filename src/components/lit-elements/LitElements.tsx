import React from 'react';
import {createComponent} from '@lit/react';
import Autocomplete from './lit-autocomplete';
import SourceTree from './lit-source';
import SourceContents from './lit-source-header';
import TextForm from './lit-textform';
import TextFormArray from './lit-textform-array';
import ButtonYes from './lit-button-yes';
import ButtonNo from './lit-button-no';
import ButtonNeutral from './lit-button-neutral';
import DialogHeader from './lit-dialog-header';
import DialogContent from './lit-dialog-content';
import DialogActions from './lit-dialog-actions';
import Button from './lit-button';
import InputText from './lit-input-text';
import InputPassword from './lit-input-password';
import Dropdown from './lit-dropdown';
import AppStatus from './lit-app-status';
import ApiErrorDialog from './lit-api-error-dialog';
import DefaultCard from './lit-default-card';
import Alert from './lit-alert';

interface EditedContentChangedEvent extends Event {
  detail: {
    value: any; // Replace 'any' with the actual type of the value
  };
}

export const LitAutocomplete = createComponent({
  tagName: 'lit-autocomplete',
  elementClass: Autocomplete,
  react: React,
});

export const LitSourceTree = createComponent({
  tagName: 'lit-source-tree',
  elementClass: SourceTree,
  react: React,
});

export const LitSource = createComponent({
  tagName: 'lit-source',
  elementClass: SourceContents,
  react: React,
});

export const LitTextform = createComponent({
  tagName: 'lit-textform',
  elementClass: TextForm,
  react: React,
});

export const LitTextformArray = createComponent({
  tagName: 'lit-textform-array',
  elementClass: TextFormArray,
  react: React,
});

export const LitButtonYes = createComponent({
  tagName: 'lit-button-yes',
  elementClass: ButtonYes,
  react: React,
});

export const LitButtonNo = createComponent({
  tagName: 'lit-button-no',
  elementClass: ButtonNo,
  react: React,
});

export const LitButtonNeutral = createComponent({
  tagName: 'lit-button-neutral',
  elementClass: ButtonNeutral,
  react: React,
});

export const LitDialogContent = createComponent({
  tagName: 'lit-dialog-content',
  elementClass: DialogContent,
  react: React,
});

export const LitDialogHeader = createComponent({
  tagName: 'lit-dialog-header',
  elementClass: DialogHeader,
  react: React,
});

export const LitDialogActions = createComponent({
  tagName: 'lit-dialog-actions',
  elementClass: DialogActions,
  react: React,
});

export const LitButton = createComponent({
  tagName: 'lit-button',
  elementClass: Button,
  react: React,
});

export const LitInputText = createComponent({
  tagName: 'lit-input-text',
  elementClass: InputText,
  react: React,
});

export const LitInputPassword = createComponent({
  tagName: 'lit-input-password',
  elementClass: InputPassword,
  react: React,
});

export const LitDropdown = createComponent({
  tagName: 'lit-dropdown',
  elementClass: Dropdown,
  react: React,
});

export const LitAppStatus = createComponent({
  tagName: 'lit-app-status',
  elementClass: AppStatus,
  react: React,
})

export const LitApiErrorDialog = createComponent({
  tagName: 'lit-api-error-dialog',
  elementClass: ApiErrorDialog,
  react: React,
})

export const LitDefaultCard = createComponent({
  tagName: 'lit-default-card',
  elementClass: DefaultCard,
  react: React,
})

export const LitAlert = createComponent({
  tagName: 'lit-alert',
  elementClass: Alert,
  react: React,
})