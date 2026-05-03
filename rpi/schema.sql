-- MobileVault SQLite Schema for Raspberry Pi Deployment
-- Version: 1.0
-- Description: Local encrypted vault storage schema

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- Vault authentication state
CREATE TABLE IF NOT EXISTS vault_auth (
  id          INTEGER PRIMARY KEY CHECK (id = 1), -- Single-row table
  is_setup    INTEGER NOT NULL DEFAULT 0,          -- 0 = not setup, 1 = setup
  salt        TEXT    NOT NULL,                    -- Base64-encoded PBKDF2 salt
  pin_hash    TEXT    NOT NULL,                    -- SHA-256 hash of PIN (for verification only)
  created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

-- Encrypted vault entries
CREATE TABLE IF NOT EXISTS vault_entries (
  id                TEXT    PRIMARY KEY,           -- Random UUID
  category          TEXT    NOT NULL,              -- passwords | medical | insurance | travel | financial | emergency
  title             TEXT    NOT NULL,              -- Entry title (plaintext for display)
  encrypted_content TEXT    NOT NULL,              -- AES-GCM encrypted content (Base64)
  iv                TEXT    NOT NULL,              -- AES-GCM IV (Base64)
  created_at        INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at        INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

-- App settings
CREATE TABLE IF NOT EXISTS vault_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default settings
INSERT OR IGNORE INTO vault_settings (key, value) VALUES
  ('auto_lock_timeout', '15'),
  ('failed_attempts',   '0'),
  ('app_version',       '1.0.0');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entries_category ON vault_entries (category);
CREATE INDEX IF NOT EXISTS idx_entries_created  ON vault_entries (created_at DESC);
