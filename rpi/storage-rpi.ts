/**
 * MobileVault - RPi Storage Adapter
 * Replaces localStorage with SQLite-backed API calls for RPi deployment
 * Drop-in replacement for client/src/lib/storage.ts
 */

import {
  deriveKeyFromPin,
  encryptData,
  decryptData,
  generateRandomBytes,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "../client/src/lib/encryption";

const API_BASE = "/api/vault";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthState {
  isSetup: boolean;
  salt: string;
}

export interface EncryptedEntry {
  id: string;
  category: string;
  title: string;
  encryptedContent: string;
  iv: string;
  createdAt: number;
  updatedAt: number;
}

export interface VaultData {
  entries: EncryptedEntry[];
}

// ─── Auth Functions ───────────────────────────────────────────────────────────

export async function isVaultInitialized(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/status`);
  const data = await res.json();
  return data.isSetup;
}

export async function initializeVault(pin: string): Promise<void> {
  const salt = generateRandomBytes(16);
  const saltBase64 = arrayBufferToBase64(salt.buffer);

  const res = await fetch(`${API_BASE}/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, salt: saltBase64 }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to initialize vault");
  }

  // Initialize empty vault data
  const vaultData: VaultData = { entries: [] };
  await saveVaultData(vaultData, pin);
}

export async function authenticateWithPin(pin: string): Promise<{ salt: string }> {
  const res = await fetch(`${API_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Authentication failed");
  }

  return { salt: data.salt };
}

export async function wipeVaultData(): Promise<void> {
  // This is called after 3 failed attempts - server handles it automatically
  // But can also be called manually from settings
  await fetch(`${API_BASE}/wipe`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: "" }), // PIN already verified by server
  });
}

// ─── Vault Data Functions ─────────────────────────────────────────────────────

export async function saveVaultData(data: VaultData, pin: string): Promise<void> {
  // Get salt from server
  const statusRes = await fetch(`${API_BASE}/status`);
  const status = await statusRes.json();

  // For initial setup, use a temporary salt until auth is complete
  const saltBase64 = status.salt || arrayBufferToBase64(generateRandomBytes(16).buffer);
  const salt = base64ToArrayBuffer(saltBase64) as Uint8Array;
  const key = await deriveKeyFromPin(pin, salt);

  // Encrypt and save each entry individually
  for (const entry of data.entries) {
    const iv = generateRandomBytes(12);
    const encrypted = await encryptData(entry.encryptedContent, key, iv);

    await fetch(`${API_BASE}/entries/${entry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: entry.title,
        encryptedContent: arrayBufferToBase64(encrypted),
        iv: arrayBufferToBase64(iv.buffer),
      }),
    });
  }
}

export async function loadVaultData(pin: string): Promise<VaultData> {
  // Get salt for key derivation
  const authRes = await fetch(`${API_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });

  if (!authRes.ok) {
    const err = await authRes.json();
    throw new Error(err.error || "Authentication failed");
  }

  const { salt: saltBase64 } = await authRes.json();
  const salt = base64ToArrayBuffer(saltBase64) as Uint8Array;
  const key = await deriveKeyFromPin(pin, salt);

  // Load all entries
  const entriesRes = await fetch(`${API_BASE}/entries`);
  const { entries: rawEntries } = await entriesRes.json();

  const entries: EncryptedEntry[] = await Promise.all(
    rawEntries.map(async (raw: any) => {
      const iv = new Uint8Array(base64ToArrayBuffer(raw.iv));
      const encrypted = base64ToArrayBuffer(raw.encrypted_content);
      const decrypted = await decryptData(encrypted, key, iv);

      return {
        id: raw.id,
        category: raw.category,
        title: raw.title,
        encryptedContent: decrypted,
        iv: raw.iv,
        createdAt: raw.created_at,
        updatedAt: raw.updated_at,
      };
    })
  );

  return { entries };
}

// ─── Entry Functions ──────────────────────────────────────────────────────────

export async function addVaultEntry(
  entry: Omit<EncryptedEntry, "id" | "createdAt" | "updatedAt" | "iv">,
  pin: string
): Promise<EncryptedEntry> {
  // Get salt for key derivation
  const authRes = await fetch(`${API_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });

  const { salt: saltBase64 } = await authRes.json();
  const salt = base64ToArrayBuffer(saltBase64) as Uint8Array;
  const key = await deriveKeyFromPin(pin, salt);

  const id = arrayBufferToBase64(generateRandomBytes(8).buffer);
  const iv = generateRandomBytes(12);
  const encrypted = await encryptData(entry.encryptedContent, key, iv);
  const ivBase64 = arrayBufferToBase64(iv.buffer);
  const encryptedBase64 = arrayBufferToBase64(encrypted);

  const res = await fetch(`${API_BASE}/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      category: entry.category,
      title: entry.title,
      encryptedContent: encryptedBase64,
      iv: ivBase64,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to save entry");
  }

  return {
    ...entry,
    id,
    iv: ivBase64,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function deleteVaultEntry(id: string, _pin: string): Promise<void> {
  const res = await fetch(`${API_BASE}/entries/${id}`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error("Failed to delete entry");
  }
}

export async function getEntriesByCategory(category: string, pin: string): Promise<EncryptedEntry[]> {
  const vaultData = await loadVaultData(pin);
  return vaultData.entries.filter((e) => e.category === category);
}

// ─── Settings Functions ───────────────────────────────────────────────────────

export async function getAutoLockTimeout(): Promise<number> {
  const res = await fetch(`${API_BASE}/settings`);
  const data = await res.json();
  return data.autoLockTimeout ?? 15;
}

export async function setAutoLockTimeoutStorage(minutes: number): Promise<void> {
  await fetch(`${API_BASE}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ autoLockTimeout: minutes }),
  });
}
