/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

// map schemas from api
export const mapSchemas = (databases: any, type: string) => {
  return databases
    .slice()
    .sort((a: any, b: any) => (a.nsfPath > b.nsfPath ? 1 : -1))
    .reduce((r: any, v: any) => {
      r = r || [];

      const targetValue = type === 'schemas' ? v.nsfPath : v.schemaName;

      r.fileName = targetValue;
      if (!r.find((db: any) => db.fileName === targetValue)) {
        r.push({ fileName: targetValue, databases: [v] });
      } else {
        const dbIndex = r.findIndex((db: any) => db.fileName === targetValue);
        r[dbIndex].databases.push(v);
      }
      return r;
    }, []);
};
