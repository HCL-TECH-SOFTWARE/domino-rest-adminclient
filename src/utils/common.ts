/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

export function fullEncode (name: string) {
  let encodedName = "";
  for (let i = 0; i < name.length; i++) {
    if (name[i] === '[' || name[i] === '!' || name[i] === ']' || name[i] === '(' || name[i] === ')' || name[i] === '*' || name[i] === '\\' || name[i] === '/' || name[i] === '$' || name[i] === '&') {
      encodedName += '%' + name[i].charCodeAt(0).toString(16);
    } else if (name[i] === undefined) {
      encodedName += ''
    } else {
      encodedName += name[i]
    }
  };
  const newName = name.replace(/[!()[]\*\/\$&A-z0-9]/g, (char: string) => {
    if (char.match(/[A-z0-9]/g)) {
      return char
    } else if (char === undefined) {
      return char
    } else {
      return '%' + char.charCodeAt(0).toString(16)
    }
  })
  console.log(newName)
  // return newName
  return encodedName
};

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