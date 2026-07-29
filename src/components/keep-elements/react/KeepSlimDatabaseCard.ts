/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import SlimDatabaseCard, {
  type KeepSlimDatabaseCardDetail
} from '../keep-slim-database-card';

/**
 * `onCardDelete` fires only when the user has the permission — the element checks
 * `databases.permissions` itself and raises the alert when it is missing, so the handler here
 * is reached with the answer already known. It still has to open the dialog: the caller sets
 * which entry is being deleted, and `keep-delete-dialog` reads its own open flag from the
 * store, so dispatching from inside the card would race that state update.
 *
 * `onContextMenu` needs no entry. `contextmenu` is a composed native event, so it crosses the
 * shadow boundary, retargets to the host and reaches React's listener unaided.
 */
export const KeepSlimDatabaseCard = createComponent({
  tagName: 'keep-slim-database-card',
  elementClass: SlimDatabaseCard,
  react: React,
  events: {
    onCardOpen: 'card-open' as EventName<CustomEvent<KeepSlimDatabaseCardDetail>>,
    onCardDelete: 'card-delete' as EventName<CustomEvent<KeepSlimDatabaseCardDetail>>
  }
});
