// PKCE Implementation in JavaScript

import { AlertManager } from "../../utils/common";

// Generate Code Verifier
function dec2hex(dec) {
    return ("0" + dec.toString(16)).substr(-2);
  }
  
function generateCodeVerifier() {
    var array = new Uint32Array(56 / 2);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec2hex).join("");
}

// Generate Code Challenge
const generateCodeChallengeFromVerifier = async (v) => {
    var hashed = await sha256(v);
    var base64encoded = base64UrlEncode(hashed);
    return base64encoded;
};

// Utility function to hash a string using SHA-256
function sha256(plain) {
    // returns promise ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest("SHA-256", data);
}

// Function to base64-url encode a string
function base64UrlEncode(a) {
    var str = "";
    var bytes = new Uint8Array(a);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return btoa(str)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
}

// Step 1: Generate Code Verifier and Code Challenge
async function generateCodeVerifierAndChallenge() {
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallengeFromVerifier(codeVerifier);
    return { codeVerifier, codeChallenge };
}

// Step 2: Initiate Authorization Request
export async function initiateAuthorizationRequest(oidcConfigUrl, clientId, redirectUri, scope = "") {
    try {
        const { authorization_endpoint } = await
            fetch(oidcConfigUrl)
                .then(res => res.json()
    )
    const { codeVerifier, codeChallenge } = await generateCodeVerifierAndChallenge();
    
    localStorage.setItem('pkce_code_verifier', codeVerifier);
    
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    if (scope.length > 0) {
        params.append('scope', scope)
    }

    const authUrl = `${authorization_endpoint}?${params.toString()}`;

    window.location.href = authUrl;

    return true
    } catch (err) {
        return false
    }
}

// Step 3: Handle Callback and Exchange Authorization Code for Token
export async function handleCallback(oidcConfigUrl, clientId, redirectUri) {
    const params = new URLSearchParams(window.location.search);
    const authorizationCode = params.get('code');

    if (!authorizationCode) {
        throw new Error('Authorization code not found in callback URL');
    }

    const codeVerifier = localStorage.getItem('pkce_code_verifier');

    if (!codeVerifier) {
        throw new Error('Code verifier not found in session storage');
    }

    const { token_endpoint } = await fetch(oidcConfigUrl).then(res => res.json());

    const tokenResponse = await fetch(token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            grant_type: 'authorization_code',
            code: authorizationCode,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier
        })
    })
    .then(res => res.json())
    .then(data => {
        return data;
    })
    .catch(err => {
        console.error(err);
        return { error: err.message }
    });

    return tokenResponse;
}

// Refresh Access Token
export async function refreshToken() {
    try {
        const oidcConfigUrl = localStorage.getItem('oidc_config_url');
        const clientId = localStorage.getItem('client_id');
        const refreshToken = JSON.parse(localStorage.getItem('refresh_token') || '{}').refresh_token;

        const { token_endpoint } = await fetch(oidcConfigUrl).then(res => res.json());

        const response = await fetch(token_endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            // Store the new token and return the data
            localStorage.setItem('user_token', JSON.stringify(data));
            return data;
        } else if (!!data.error) {
            // Handle specific error cases
            if (data.error === 'invalid_grant') {
                alert("Invalid refresh token. Please log in again.");
                localStorage.removeItem('user_token');
                window.location.reload();
            } else if (data.error === 'invalid_client') {
                alert("Invalid client credentials. Please check your configuration.");
            } else {
                alert(`Error: ${data.error}`);
            }
        } else {
            // Return an error object if the response is not OK
            return { error: data.error || "Failed to refresh token" };
        }
    } catch (err) {
        console.error(err);
        localStorage.removeItem('user_token');
        AlertManager.showAlert("Invalid credentials. Going back to the login page.");
        window.location.reload();
        return { error: err.message || "An unexpected error occurred during token refresh" };
    }
}