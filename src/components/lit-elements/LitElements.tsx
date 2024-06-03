import React from 'react';
import {createComponent} from '@lit/react';
import Autocomplete from './lit-autocomplete';
import SourceTree from './lit-source';

export const LitAutocomplete = createComponent({
  tagName: 'lit-autocomplete',
  elementClass: Autocomplete,
  react: React,
});

export const LitSource = createComponent({
  tagName: 'lit-source',
  elementClass: SourceTree,
  react: React,
});