import React from 'react';
import {createComponent} from '@lit/react';
import Autocomplete from './lit-autocomplete';

export const LitAutocomplete = createComponent({
  tagName: 'lit-autocomplete',
  elementClass: Autocomplete,
  react: React,
});