/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

export function fullEncode(name: string): string {
  return name.replace(/[\[\]!()\*\\\/$&'#]/g, (char) => '%' + char.charCodeAt(0).toString(16));
}

// Function to insert a character or string inside another string for every interval of characters
export function insertCharacter (inputString: string, interval: number, insertChar: string) {
  let outputString = ""
  for (let i = 0; i < inputString.length; i += interval) {
    let slice = inputString.substr(i, interval)
    if(slice.length===interval && i===(slice.length-1))
       outputString = outputString.concat(slice, insertChar)
    else
       outputString = outputString.concat(slice)
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
  var cd = 24 * 60 * 60 * 1000,
    ch = 60 * 60 * 1000,
    d = Math.floor(t / cd),
    h = Math.floor( (t - d * cd) / ch),
    m = Math.round( (t - d * cd - h * ch) / 60000),
    pad = function(n: number){ return n < 10 ? '0' + n : n; };
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