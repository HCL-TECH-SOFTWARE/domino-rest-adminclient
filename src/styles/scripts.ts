/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import appIcons from './app-icons';

export const checkIcon = (icon: string) => {
  return icon in appIcons;
};
