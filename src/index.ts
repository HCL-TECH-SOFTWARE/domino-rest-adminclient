/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

// Apply theme before React renders to prevent flash
// TODO: simplify after wa transition to wa-dark
// TODO extend them to dark, light and system themes
const theme = localStorage.getItem('theme');
const isDark = theme === 'dark';
if (isDark) {
  document.documentElement.style.colorScheme = 'dark';
  document.documentElement.classList.add('wa-dark');
  document.body.dataset.theme = 'dark';
} else {
  document.documentElement.style.colorScheme = 'light';
  document.documentElement.classList.remove('wa-dark');
}
