/**
 * Storage utilities for Secure Vault
 * Manages encrypted data persistence and authentication state
 */

import {
  deriveKeyFromPin,
  encryptData,
  decryptData,
  generateRandomBytes,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "./encryption";

const STORAGE_KEYS = {
  AUTH_STATE: "vault_auth_state",
  ENCRYPTED_DATA: "vault_encrypted_data",
  FAILED_ATTEMPTS: "vault_failed_attempts",
  SALT: "vault_salt",
  IV_PREFIX: "vault_iv_",
  CREDENTIAL_ID: "vault_credential_id",
};

export interface AuthState {
  isSetup: boolean;
  authMethod: "pin" | "fingerprint"; // New: track authentication method
  useBiometric: boolean;
  salt: string; // Base64 encoded salt
  credentialId?: string; // For fingerprint auth
}

export interface EncryptedEntry {
  id: string;
  category: string;
  title: string;
  encryptedContent: string; // Base64 encoded
  iv: string; // Base64 encoded
  createdAt: number;
  updatedAt: number;
}

export interface VaultData {
  entries: EncryptedEntry[];
}

/**
 * Initialize vault on first setup
 */
export async function initializeVault(
  pin: string,
  authMethod: "pin" | "fingerprint" = "pin",
  credentialId?: string
): Promise<void> {
  const salt = generateRandomBytes(16);
  const saltBase64 = arrayBufferToBase64(salt.buffer);

  const authState: AuthState = {
    isSetup: true,
    authMethod,
    useBiometric: authMethod === "fingerprint",
    salt: saltBase64,
    credentialId,
  };

  localStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(authState));
  localStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, "0");

  // Initialize empty vault
  const vaultData: VaultData = { entries: [] };
  await saveVaultData(vaultData, pin);
}

/**
 * Get authentication state
 */
export function getAuthState(): AuthState | null {
  const stored = localStorage.getItem(STORAGE_KEYS.AUTH_STATE);
  return stored ? JSON.parse(stored) : null;
}

/**
 * Update biometric preference
 */
export function updateBiometricPreference(useBiometric: boolean): void {
  const authState = getAuthState();
  if (authState) {
    authState.useBiometric = useBiometric;
    localStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(authState));
  }
}

/**
 * Save encrypted vault data
 */
export async function saveVaultData(data: VaultData, pin: string): Promise<void> {
  const authState = getAuthState();
  if (!authState) throw new Error("Vault not initialized");

  const salt = base64ToArrayBuffer(authState.salt) as Uint8Array;
  const key = await deriveKeyFromPin(pin, salt);
  const iv = generateRandomBytes(12);

  const jsonData = JSON.stringify(data);
  const encrypted = await encryptData(jsonData, key, iv);

  const encryptedBase64 = arrayBufferToBase64(encrypted);
  const ivBase64 = arrayBufferToBase64(iv.buffer);

  localStorage.setItem(STORAGE_KEYS.ENCRYPTED_DATA, encryptedBase64);
  localStorage.setItem(STORAGE_KEYS.IV_PREFIX + "data", ivBase64);
}

/**
 * Load and decrypt vault data
 */
export async function loadVaultData(pin: string): Promise<VaultData> {
  const authState = getAuthState();
  if (!authState) throw new Error("Vault not initialized");

  const encryptedBase64 = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_DATA);
  const ivBase64 = localStorage.getItem(STORAGE_KEYS.IV_PREFIX + "data");

  if (!encryptedBase64 || !ivBase64) {
    throw new Error("No encrypted data found");
  }

  const salt = base64ToArrayBuffer(authState.salt) as Uint8Array;
  const key = await deriveKeyFromPin(pin, salt);
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const encrypted = base64ToArrayBuffer(encryptedBase64);

  const jsonData = await decryptData(encrypted, key, iv);
  return JSON.parse(jsonData);
}

/**
 * Get current failed attempts count
 */
export function getFailedAttempts(): number {
  const count = localStorage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Increment failed attempts
 */
export function incrementFailedAttempts(): number {
  const current = getFailedAttempts();
  const next = current + 1;
  localStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, next.toString());
  return next;
}

/**
 * Reset failed attempts
 */
export function resetFailedAttempts(): void {
  localStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, "0");
}

/**
 * Wipe all vault data (3-strike lockout)
 */
export function wipeVaultData(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
  localStorage.removeItem(STORAGE_KEYS.ENCRYPTED_DATA);
  localStorage.removeItem(STORAGE_KEYS.FAILED_ATTEMPTS);
  localStorage.removeItem(STORAGE_KEYS.SALT);
  localStorage.removeItem(STORAGE_KEYS.CREDENTIAL_ID);

  // Remove all IV entries
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith(STORAGE_KEYS.IV_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Check if vault is initialized
 */
export function isVaultInitialized(): boolean {
  return getAuthState() !== null;
}

/**
 * Add new entry to vault
 */
export async function addVaultEntry(
  entry: Omit<EncryptedEntry, "id" | "createdAt" | "updatedAt" | "iv">,
  pin: string
): Promise<EncryptedEntry> {
  const vaultData = await loadVaultData(pin);

  const newEntry: EncryptedEntry = {
    ...entry,
    id: generateRandomBytes(8).toString(),
    iv: arrayBufferToBase64(generateRandomBytes(12).buffer),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  vaultData.entries.push(newEntry);
  await saveVaultData(vaultData, pin);

  return newEntry;
}

/**
 * Update existing entry
 */
export async function updateVaultEntry(
  id: string,
  updates: Partial<Omit<EncryptedEntry, "id" | "createdAt" | "iv">>,
  pin: string
): Promise<EncryptedEntry> {
  const vaultData = await loadVaultData(pin);

  const entryIndex = vaultData.entries.findIndex((e) => e.id === id);
  if (entryIndex === -1) throw new Error("Entry not found");

  const entry = vaultData.entries[entryIndex];
  vaultData.entries[entryIndex] = {
    ...entry,
    ...updates,
    updatedAt: Date.now(),
  };

  await saveVaultData(vaultData, pin);
  return vaultData.entries[entryIndex];
}

/**
 * Delete entry from vault
 */
export async function deleteVaultEntry(id: string, pin: string): Promise<void> {
  const vaultData = await loadVaultData(pin);
  vaultData.entries = vaultData.entries.filter((e) => e.id !== id);
  await saveVaultData(vaultData, pin);
}

/**
 * Get all entries by category
 */
export async function getEntriesByCategory(
  category: string,
  pin: string
): Promise<EncryptedEntry[]> {
  const vaultData = await loadVaultData(pin);
  return vaultData.entries.filter((e) => e.category === category);
}

/**
 * Get auto-lock timeout setting (in minutes)
 */
export function getAutoLockTimeout(): number {
  const stored = localStorage.getItem("vault_auto_lock_timeout");
  return stored ? parseInt(stored, 10) : 15; // Default 15 minutes
}

/**
 * Set auto-lock timeout (in minutes)
 */
export function setAutoLockTimeoutStorage(minutes: number): void {
  localStorage.setItem("vault_auto_lock_timeout", minutes.toString());
}


// Export/Import Backup Functions
export interface VaultBackup {
  version: string;
  timestamp: number;
  encryptedData: string;
  ivData: string;
  salt: string;
  authState: AuthState;
}

/**
 * Export encrypted vault data as a backup file
 */
export async function exportVaultBackup(pin: string): Promise<VaultBackup> {
  const authState = getAuthState();
  if (!authState) {
    throw new Error("Vault not initialized. Cannot export.");
  }

  const encryptedData = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_DATA);
  const ivData = localStorage.getItem(STORAGE_KEYS.IV_PREFIX + "data");

  if (!encryptedData || !ivData) {
    throw new Error("Vault data not found. Please ensure vault is initialized.");
  }

  // Verify PIN is correct by attempting to load vault data
  try {
    await loadVaultData(pin);
  } catch {
    throw new Error("Invalid PIN. Cannot export vault.");
  }

  return {
    version: "1.0",
    timestamp: Date.now(),
    encryptedData,
    ivData,
    salt: authState.salt,
    authState,
  };
}

/**
 * Import encrypted vault backup from file
 */
export async function importVaultBackup(backup: VaultBackup): Promise<void> {
  // Validate backup structure
  if (!backup.version || !backup.encryptedData || !backup.salt || !backup.ivData || !backup.authState) {
    throw new Error("Invalid backup file format.");
  }

  if (backup.version !== "1.0") {
    throw new Error("Unsupported backup version.");
  }

  // Check if vault already exists
  const existingAuthState = getAuthState();
  if (existingAuthState) {
    throw new Error("Vault already exists. Please wipe all data first to import a backup.");
  }

  // Restore backup data
  localStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(backup.authState));
  localStorage.setItem(STORAGE_KEYS.ENCRYPTED_DATA, backup.encryptedData);
  localStorage.setItem(STORAGE_KEYS.IV_PREFIX + "data", backup.ivData);
  localStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, "0");
}

/**
 * Generate a downloadable backup file
 */
export function downloadBackupFile(backup: VaultBackup): void {
  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mobilevault-backup-${backup.timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse backup file from user input
 */
export async function parseBackupFile(file: File): Promise<VaultBackup> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const backup = JSON.parse(content) as VaultBackup;
        resolve(backup);
      } catch (err) {
        reject(new Error("Failed to parse backup file. Please ensure it's a valid MobileVault backup."));
      }
    };
    reader.onerror = () => {
      reject(new Error("Failed to read backup file."));
    };
    reader.readAsText(file);
  });
}
