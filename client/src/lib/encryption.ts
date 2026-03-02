/**
 * Encryption utilities for Secure Vault
 * Uses Web Crypto API for client-side encryption/decryption
 * All encryption happens locally - no data sent to servers
 */

/**
 * Derive encryption key from PIN using PBKDF2
 */
export async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinBuffer = encoder.encode(pin);

  // Import the PIN as a key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    pinBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive a key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt data with AES-GCM
 */
export async function encryptData(
  data: string,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  return crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    dataBuffer
  );
}

/**
 * Decrypt data with AES-GCM
 */
export async function decryptData(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Generate random bytes for salt and IV
 */
export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Convert ArrayBuffer to Base64 for storage
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 to ArrayBuffer for decryption
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if browser supports Web Crypto API
 */
export function isCryptoSupported(): boolean {
  return !!(
    typeof crypto !== "undefined" &&
    crypto.subtle &&
    typeof crypto.getRandomValues === "function"
  );
}

/**
 * Check if browser supports Fingerprint API (WebAuthn)
 */
export async function isFingerprintSupported(): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    return false;
  }

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}
