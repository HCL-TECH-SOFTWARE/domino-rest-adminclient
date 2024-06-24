import React from 'react';
import {createComponent, EventName} from '@lit/react';
import Autocomplete from './lit-autocomplete';
import SourceTree from './lit-source';
// import {type EventName}

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

export const LitSource = createComponent({
  tagName: 'lit-source',
  elementClass: SourceTree,
  react: React,
  // events: {
  //   onEditedContentChanged: 'edited-content-changed' as EventName<EditedContentChangedEvent>,
  // }
});