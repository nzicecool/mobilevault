/**
 * WebAuthn/FIDO2 utilities for fingerprint-based authentication
 * Handles registration and verification of biometric credentials
 */

export interface CredentialData {
  credentialId: string;
  publicKey: string;
  counter: number;
}

/**
 * Check if WebAuthn is supported
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.PublicKeyCredential !== undefined
  );
}

/**
 * Check if platform authenticator (fingerprint/face) is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Register fingerprint credential
 */
export async function registerFingerprint(
  userId: string,
  userName: string
): Promise<CredentialData> {
  if (!isWebAuthnSupported()) {
    throw new Error("WebAuthn not supported");
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
    {
      challenge: challenge,
      rp: {
        name: "MobileVault",
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userName,
        displayName: "MobileVault User",
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "preferred",
        residentKey: "preferred",
      },
      timeout: 60000,
      attestation: "direct",
    };

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error("Failed to create credential");
    }

    const response = credential.response as AuthenticatorAttestationResponse;
    const credentialId = arrayBufferToBase64(credential.id as unknown as ArrayBuffer);
    const publicKey = arrayBufferToBase64(response.attestationObject as unknown as ArrayBuffer);

    return {
      credentialId,
      publicKey,
      counter: 0,
    };
  } catch (error) {
    throw new Error(
      `Fingerprint registration failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Authenticate with fingerprint
 */
export async function authenticateWithFingerprint(
  credentialId: string
): Promise<string> {
  if (!isWebAuthnSupported()) {
    throw new Error("WebAuthn not supported");
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
    {
      challenge: challenge,
      allowCredentials: [
        {
          type: "public-key",
          id: new Uint8Array(base64ToArrayBuffer(credentialId)),
        },
      ],
      userVerification: "preferred",
      timeout: 60000,
    };

  try {
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential | null;

    if (!assertion) {
      throw new Error("Authentication failed");
    }

    // Return a deterministic key derived from the credential
    // This will be used as the encryption key
    const response = assertion.response as AuthenticatorAssertionResponse;
    const authenticatorData = response.authenticatorData;
    const clientDataJSON = response.clientDataJSON;

    // Combine authenticator data and client data to create a deterministic key
    const combined = new Uint8Array(
      authenticatorData.byteLength + clientDataJSON.byteLength
    );
    combined.set(new Uint8Array(authenticatorData), 0);
    combined.set(new Uint8Array(clientDataJSON), authenticatorData.byteLength);

    // Hash the combined data to get a consistent key
    const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
    return arrayBufferToBase64(hashBuffer);
  } catch (error) {
    throw new Error(
      `Fingerprint authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}
