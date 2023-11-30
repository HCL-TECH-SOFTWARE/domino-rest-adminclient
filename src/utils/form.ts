/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

export const isEmptyOrSpaces = (str: string) => {
  return str === null || str.match(/^ *$/) !== null;
};
export const verifyModeName = (str: string) => {
  return str.match(/[A-Za-z0-9_\s]+$/) == null;
};
