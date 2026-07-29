/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/** One breadcrumb entry. */
export interface KeepHistory {
  uri: string;
  label: string;
}

/** Shape of the breadcrumb-history slice of state. */
export interface HistoryState {
  histories: KeepHistory[];
}
