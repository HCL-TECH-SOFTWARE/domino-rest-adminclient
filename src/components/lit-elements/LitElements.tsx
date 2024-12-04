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