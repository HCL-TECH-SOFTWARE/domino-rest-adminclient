/*
 * WebAuthn
 *
 * Copyright (c) 2020 Paulo Lopes <pmlopes@gmail.com>
 * Licensed under the Apache 2 license.
 *
 * (C) 2023 ES6 conversion HCL America Inc
 */

import { base64urlEncode, base64urlDecode } from "./base64url-arraybuffer";

// Helper to sucessfully GET JSON, boiler plate
const jsonGet = (path: string, bearer: any) => {
    return fetch(path, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer ' + bearer.bearer
      }
    }).then((res) => {
      if (res.status >= 200 && res.status < 300) {
        return res;
      }
      throw new Error(res.statusText);
    });
  };
  
  // Helper to sucessfully POST JSON, boiler plate
  const jsonPost = async (path: string, bearer: any, body: any) => {
    const options = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: '',
      },
      body: JSON.stringify(body)
    };
  
    if (bearer) {
      options.headers.Authorization = 'Bearer ' + bearer.bearer;
    }
    
    return fetch(path, options).then((res) => {
      if (res.status >= 200 && res.status < 300) {
        return res;
      }
      throw new Error(res.statusText);
    });
  };
  
  /* WebAuthn implementation as ES6 class */
  export class WebAuthn {
    loginPath: string;
    registerPath: string;
    callbackPath: string;
    
    // Need 3 path settings to proceed
    constructor(options: {registerPath: string, loginPath: string, callbackPath: string}) {
      this.registerPath = options.registerPath;
      this.loginPath = options.loginPath;
      this.callbackPath = options.callbackPath;
      // validation
      if (!this.callbackPath) {
        throw new Error('Callback path is missing!');
      }
    }
  
    // One time registration
    async register(bearer: any) {
      const self = this;
      if (!self.registerPath) {
        return Promise.reject(
          'Register path missing form the initial configuration!'
        );
      }
      return jsonGet(self.registerPath, bearer)
        .then((res) => {
          return res.json()
        })
        .then((res) => {
          res.challenge = base64urlDecode(res.challenge);
          res.user.id = base64urlDecode(res.user.id);
          if (res.excludeCredentials) {
            for (const xc of res.excludeCredentials) {
              xc.id = base64urlDecode(xc.id);
            }
          }
          return res;
        })
        .then(async (res) => {
          return await navigator.credentials.create({ publicKey: res })
        })
        .then((credential: any) => {
          const body = {
            id: credential.id,
            rawId: base64urlEncode(credential.rawId),
            response: {
              attestationObject: base64urlEncode(
                credential.response.attestationObject
              ),
              clientDataJSON: base64urlEncode(credential.response.clientDataJSON)
            },
            type: credential.type
          };
          return jsonPost(self.callbackPath, bearer, body);
        })
        .catch((e) => {
          // If the code is 11, there's already a credential
          if (e.code === 11) {
            const result = {json: () => {
              let user = bearer.claims.sub;
              let cleanUser = user
                .replace('CN=', '')
                .replace('/C=', '/')
                .replace('/O=', '/')
                .replaceAll('/OU=', '/');
              return {
                username: cleanUser
              }}
            };
            result.json = () => {
              let user = bearer.claims.sub;
              let cleanUser = user
                .replace('CN=', '')
                .replace('/C=', '/')
                .replace('/O=', '/')
                .replaceAll('/OU=', '/');
              return {
                username: cleanUser
              };
            };
            return result;
          } else {
            console.error(e);
            throw e;
          }
        });
    }
  
    // login challenge
    async login(user: {name: string }) {
      const self = this;
      if (!self.loginPath) {
        return Promise.reject(
          'Login path missing from the initial configuration!'
        );
      }
      return jsonPost(self.loginPath, null, user)
        .then((res) => {
          return res.json()
        })
        .then((res) => {
          res.challenge = base64urlDecode(res.challenge);
          if (res.allowCredentials) {
            for (const ac of res.allowCredentials) {
              ac.id = base64urlDecode(ac.id);
            }
          }
          return res;
        })
        .then((res) => navigator.credentials.get({ publicKey: res }))
        .then((credential: any) => {
          const body = {
            id: credential.id,
            rawId: base64urlEncode(credential.rawId),
            response: {
              clientDataJSON: base64urlEncode(
                credential.response.clientDataJSON
              ),
              authenticatorData: base64urlEncode(
                credential.response.authenticatorData
              ),
              signature: base64urlEncode(credential.response.signature),
              userHandle: base64urlEncode(credential.response.userHandle)
            },
            type: credential.type
          };
          return jsonPost(self.callbackPath, null, body);
        });
    }
  }
  