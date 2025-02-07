/* ========================================================================== *
 * Copyright (C) 2023, 2024 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

// Access the package.json file
import * as packageJson from '../package.json';

// Preferred Configuration
export const PREF_QUERY = 'keepconfig';

export const BASE_KEEP_API_URL = '/api/v1';
export const SETUP_KEEP_API_URL = '/api/setup-v1';
export const PIM_KEEP_API_URL = '/api/pim-v1';
export const ADMIN_KEEP_API_URL = '/api/admin-v1';
export const IDP_KEEP_API_URL = '/api/keepidp-v1'

// ASSETS DIRECTORY
export const IMG_DIR = '/admin/img';
export const MONACO_EDITOR_DIR = '/monaco-editor-core';

// Theming
export const KEEP_ADMIN_BASE_COLOR = '#5F1EBE';
export const HCL_BASE_COLOR = '#3C91FF';

// Theme Switching
export const DARK_PRIMARY_COLOR = '#15171a';
export const DARK_SECONDARY_COLOR = '#232529';
export const DARK_INVERSE_COLOR = '#0d0e0f';
export const DARK_BORDER_PRIMARY_COLOR = '#1e1f21';

export const BUILD_VERSION = packageJson.version;
