/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * The keys of `app-icons.ts`, in source order, without the 219 KB of base64 payload.
 *
 * #772 moved the payload map behind a dynamic `import()`, but three things still need
 * the names *synchronously* during the first render:
 *
 *   - `checkIcon()` (styles/scripts.ts) decides whether a card shows an icon or the
 *     generic storage glyph. If it answered `false` until the chunk landed, every card
 *     would render the fallback and then swap.
 *   - the icon pickers select by list index (`handleMenuItemClick(_, index)`), so the
 *     order here has to be the order the grid renders in — which is this order.
 *   - `iconName` is persisted server-side, so an unknown name must stay recognizable
 *     as unknown rather than as not-yet-loaded.
 *
 * Duplicating the names is the price of not importing the payloads.
 * `test/styles/app-icon-names.test.ts` asserts this list is exactly
 * `Object.keys(appIcons)`, in order, so the two cannot drift.
 */
export const APP_ICON_NAMES: readonly string[] = [
  'archeology',
  'barcode_scanner',
  'beach',
  'beach-1',
  'binoculars',
  'bridge',
  'buy',
  'calendar',
  'camera',
  'car_theft',
  'carousel',
  'cash_register',
  'cathedral',
  'circuit',
  'cocktail',
  'cocktail-1',
  'compass',
  'confectionery',
  'cotton_candy',
  'credit-card',
  'cruise',
  'delivery',
  'discount',
  'factory',
  'flip-flops',
  'fraud',
  'gas_mask',
  'gas_station',
  'gift',
  'greentech',
  'hacking',
  'handcuffs',
  'handshake',
  'home_decorations',
  'hospital',
  'hotel',
  'jewelry',
  'keep_dry',
  'kitchenwares',
  'landmark',
  'limousine',
  'map',
  'map-1',
  'mask',
  'memory_slot',
  'motion_detector',
  'mountain',
  'move_by_trolley',
  'navigation',
  'oil_indaustry',
  'passport',
  'photo',
  'plane',
  'plane-tickets',
  'plug',
  'plush',
  'poison',
  'pos_terminal',
  'postcard',
  'price_tag_euro',
  'price_tag_usd',
  'product',
  'qr_code',
  'radar',
  'research',
  'restaurant',
  'return_purchase',
  'robot',
  'sell',
  'shoppig_bag',
  'shopping_cart',
  'shopping_cart_loaded',
  'signpost',
  'solar_panel',
  'souvenirs',
  'stationery',
  'suitcase',
  'sunglasses',
  'sunset',
  'swimming-pool',
  'take-off',
  'train',
  'travel',
  'trekking',
  'wallet',
  'wind_turbine'
];

/** The icon every caller falls back to when `iconName` is missing or unknown. */
export const DEFAULT_APP_ICON_NAME = 'beach';
