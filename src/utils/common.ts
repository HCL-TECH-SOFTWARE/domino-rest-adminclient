/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

export function fullEncode(name: string): string {
  return name.replace(/[[\]!()*\\/$&'#]/g, (char) => '%' + char.charCodeAt(0).toString(16));
}

/**
 * Percent-encode a value for use as a **query-string value** (#978).
 *
 * A query value and a path segment are different positions with different rules, and this
 * codebase had only {@link fullEncode}, which is written for the second. `fullEncode` escapes
 * the twelve characters Domino design names carry and nothing else, so a value it produces
 * still contains a raw `+`, `%` or space — harmless in a path segment, and in a query string
 * respectively a space on many servers, a malformed escape, and a value the URL parser has to
 * repair. That is why this is a second function rather than a wider character class on the
 * first: widening `fullEncode` would change how every form and view *name* is addressed.
 *
 * The rule here is the standard one — `encodeURIComponent`, plus the five sub-delimiters it
 * leaves alone. Those five are exactly the ones `fullEncode` does escape, so this is a strict
 * superset of it: nothing that was escaped before stops being escaped, and `+`, `%`, space,
 * `,` and `;` start being.
 *
 * Escaping more than the server strictly requires is safe in a way that escaping less is not.
 * The reverse — leaving `&` or `#` raw, as most call sites did before #978 — ends the value
 * early, so the request addresses a different database and fails as a confusing 404.
 */
export function encodeQueryValue(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => '%' + char.charCodeAt(0).toString(16).toUpperCase(),
  );
}

// Function to insert a character or string inside another string for every interval of characters
export function insertCharacter (inputString: string, interval: number, insertChar: string) {
  let outputString = ""
  for (let i = 0; i < inputString.length; i += interval) {
    const slice = inputString.substring(i, i + interval)
    outputString += slice
    // Insert the character between slices, but not after the last one
    if (i + interval < inputString.length) {
      outputString += insertChar
    }
  }
  return outputString
}

// Capitalize the first letter of a string.
export function capitalizeFirst (inputString: string) {
  return inputString[0].toUpperCase() + inputString.slice(1)
}

// Get the string equivalent of expiration from milliseconds in this format ---> dd:hh:mm.
// Copied from Stack Overflow: https://stackoverflow.com/questions/8528382/javascript-show-milliseconds-as-dayshoursmins-without-seconds
export function stringExpiration(t: number){
  const cd = 24 * 60 * 60 * 1000;
  const ch = 60 * 60 * 1000;
  let d = Math.floor(t / cd);
  let h = Math.floor( (t - d * cd) / ch);
  let m = Math.round( (t - d * cd - h * ch) / 60000);
  const pad = function(n: number){ return n < 10 ? '0' + n : n; };
  if( m === 60 ){
    h++;
    m = 0;
  }
  if( h === 24 ){
    d++;
    h = 0;
  }

  return [d, pad(h), pad(m)].join(':');
}

export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    return true
  }

  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false
  }

  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) {
    return false
  }

  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false
    }
  }

  return true
}

export function areArraysEqual (arr1: Array<any>, arr2: Array<any>): boolean {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
};

/* Helper function to check if login came back as JSON */
export const checkForResponse = (response: Response) => {
  if (!response.ok) {
    if (response.headers.get('Content-Type')?.includes('application/json')) {
      return response.json();
    }
    const errResponse: any = {
      status: response.status,
      message: response.statusText,
      errorId: 0
    };
    return Promise.resolve(errResponse);
  }
  return response.json();
};

export class AlertManager {
  static alertShown = false;

  static showAlert(message: string) {
      if (!this.alertShown) {
          this.alertShown = true;
          alert(message);
      }
  }

  static resetAlert() {
      this.alertShown = false;
  }
}