import React from 'react';
import {createComponent} from '@lit/react';
import Autocomplete from './lit-autocomplete';
import SourceTree from './lit-source';
import SourceContents from './lit-source-header';

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