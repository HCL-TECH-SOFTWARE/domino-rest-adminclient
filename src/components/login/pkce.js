// PKCE Implementation in JavaScript

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
export async function initiateAuthorizationRequest(oidcConfigUrl, clientId, redirectUri, scope) {
    console.log(redirectUri)
    const { authorization_endpoint } = await fetch(oidcConfigUrl).then(res => res.json());
    const { codeVerifier, codeChallenge } = await generateCodeVerifierAndChallenge();
    
    sessionStorage.setItem('pkce_code_verifier', codeVerifier);
    console.log("hello")

    const authUrl = `${authorization_endpoint}?` +
        new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            scope: scope,
        });

    window.location.href = authUrl;

    // handleCallback(oidcConfigUrl, clientId, redirectUri);
}

// Step 3: Handle Callback and Exchange Authorization Code for Token
export async function handleCallback(oidcConfigUrl, clientId, redirectUri) {
    const params = new URLSearchParams(window.location.search);
    const authorizationCode = params.get('code');

    if (!authorizationCode) {
        throw new Error('Authorization code not found in callback URL');
    }

    const codeVerifier = sessionStorage.getItem('pkce_code_verifier');

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
        console.log(data);
        return data;
    })
    .catch(err => {
        console.error(err);
        return { error: err.message }
    });

    return tokenResponse;
}

// window.initiateAuthorizationRequest = initiateAuthorizationRequest;
// window.handleCallback = handleCallback;
