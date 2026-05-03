/**
 * MobileVault - Raspberry Pi Server
 * Express + better-sqlite3 backend for local RPi deployment
 * All vault data is stored in a local SQLite database
 */

import express from "express";
import Database from "better-sqlite3";
import { createHash, randomBytes } from "crypto";
import { readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || join(__dirname, "data");
const DB_PATH = join(DATA_DIR, "mobilevault.db");
const DIST_DIR = join(__dirname, "dist");

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize SQLite database
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Apply schema
const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

const app = express();
app.use(express.json({ limit: "10mb" }));

// Serve built frontend
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
} else {
  console.warn("[WARNING] dist/ not found. Run 'pnpm build' first.");
}

// ─── Helper functions ────────────────────────────────────────────────────────

function hashPin(pin) {
  return createHash("sha256").update(pin + "mobilevault").digest("hex");
}

function getFailedAttempts() {
  const row = db.prepare("SELECT value FROM vault_settings WHERE key = 'failed_attempts'").get();
  return row ? parseInt(row.value, 10) : 0;
}

function setFailedAttempts(count) {
  db.prepare("UPDATE vault_settings SET value = ? WHERE key = 'failed_attempts'").run(String(count));
}

function getSetting(key) {
  const row = db.prepare("SELECT value FROM vault_settings WHERE key = ?").get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare("INSERT OR REPLACE INTO vault_settings (key, value) VALUES (?, ?)").run(key, String(value));
}

// ─── Auth Routes ─────────────────────────────────────────────────────────────

// Check if vault is initialized
app.get("/api/vault/status", (req, res) => {
  const auth = db.prepare("SELECT is_setup FROM vault_auth WHERE id = 1").get();
  const failedAttempts = getFailedAttempts();
  res.json({
    isSetup: auth ? auth.is_setup === 1 : false,
    failedAttempts,
    maxAttempts: 3,
  });
});

// Initialize vault with PIN
app.post("/api/vault/setup", (req, res) => {
  const { pin, salt } = req.body;

  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return res.status(400).json({ error: "PIN must be exactly 6 digits" });
  }

  const existing = db.prepare("SELECT id FROM vault_auth WHERE id = 1").get();
  if (existing) {
    return res.status(409).json({ error: "Vault already initialized" });
  }

  const pinHash = hashPin(pin);
  const vaultSalt = salt || randomBytes(16).toString("base64");

  db.prepare(`
    INSERT INTO vault_auth (id, is_setup, salt, pin_hash)
    VALUES (1, 1, ?, ?)
  `).run(vaultSalt, pinHash);

  res.json({ success: true, salt: vaultSalt });
});

// Authenticate with PIN
app.post("/api/vault/auth", (req, res) => {
  const { pin } = req.body;

  const auth = db.prepare("SELECT * FROM vault_auth WHERE id = 1").get();
  if (!auth) {
    return res.status(404).json({ error: "Vault not initialized" });
  }

  const failedAttempts = getFailedAttempts();
  if (failedAttempts >= 3) {
    return res.status(423).json({ error: "Vault locked. Too many failed attempts.", locked: true });
  }

  const pinHash = hashPin(pin);
  if (pinHash !== auth.pin_hash) {
    const newCount = failedAttempts + 1;
    setFailedAttempts(newCount);

    if (newCount >= 3) {
      // Wipe all data on 3rd failed attempt
      db.exec(`
        DELETE FROM vault_entries;
        DELETE FROM vault_auth;
        UPDATE vault_settings SET value = '0' WHERE key = 'failed_attempts';
      `);
      return res.status(423).json({
        error: "Too many failed attempts. All data has been wiped.",
        wiped: true,
      });
    }

    return res.status(401).json({
      error: "Invalid PIN",
      failedAttempts: newCount,
      remainingAttempts: 3 - newCount,
    });
  }

  // Success - reset failed attempts
  setFailedAttempts(0);
  res.json({ success: true, salt: auth.salt });
});

// Wipe all vault data
app.delete("/api/vault/wipe", (req, res) => {
  const { pin } = req.body;

  const auth = db.prepare("SELECT * FROM vault_auth WHERE id = 1").get();
  if (!auth) {
    return res.status(404).json({ error: "Vault not initialized" });
  }

  const pinHash = hashPin(pin);
  if (pinHash !== auth.pin_hash) {
    return res.status(401).json({ error: "Invalid PIN" });
  }

  db.exec(`
    DELETE FROM vault_entries;
    DELETE FROM vault_auth;
    UPDATE vault_settings SET value = '0' WHERE key = 'failed_attempts';
  `);

  res.json({ success: true });
});

// ─── Vault Entry Routes ───────────────────────────────────────────────────────

// Get all entries (encrypted) by category
app.get("/api/vault/entries", (req, res) => {
  const { category } = req.query;

  let entries;
  if (category) {
    entries = db.prepare("SELECT * FROM vault_entries WHERE category = ? ORDER BY created_at DESC").all(category);
  } else {
    entries = db.prepare("SELECT * FROM vault_entries ORDER BY created_at DESC").all();
  }

  res.json({ entries });
});

// Get entry counts per category
app.get("/api/vault/entries/counts", (req, res) => {
  const counts = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM vault_entries
    GROUP BY category
  `).all();

  const result = {};
  counts.forEach((row) => {
    result[row.category] = row.count;
  });

  res.json({ counts: result });
});

// Get single entry
app.get("/api/vault/entries/:id", (req, res) => {
  const entry = db.prepare("SELECT * FROM vault_entries WHERE id = ?").get(req.params.id);
  if (!entry) {
    return res.status(404).json({ error: "Entry not found" });
  }
  res.json({ entry });
});

// Add new entry
app.post("/api/vault/entries", (req, res) => {
  const { id, category, title, encryptedContent, iv } = req.body;

  if (!id || !category || !title || !encryptedContent || !iv) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const now = Date.now();
  db.prepare(`
    INSERT INTO vault_entries (id, category, title, encrypted_content, iv, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, category, title, encryptedContent, iv, now, now);

  res.json({ success: true, id });
});

// Update entry
app.put("/api/vault/entries/:id", (req, res) => {
  const { title, encryptedContent, iv } = req.body;

  const existing = db.prepare("SELECT id FROM vault_entries WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Entry not found" });
  }

  db.prepare(`
    UPDATE vault_entries
    SET title = ?, encrypted_content = ?, iv = ?, updated_at = ?
    WHERE id = ?
  `).run(title, encryptedContent, iv, Date.now(), req.params.id);

  res.json({ success: true });
});

// Delete entry
app.delete("/api/vault/entries/:id", (req, res) => {
  const existing = db.prepare("SELECT id FROM vault_entries WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Entry not found" });
  }

  db.prepare("DELETE FROM vault_entries WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ─── Settings Routes ──────────────────────────────────────────────────────────

// Get settings
app.get("/api/vault/settings", (req, res) => {
  const autoLockTimeout = getSetting("auto_lock_timeout") || "15";
  res.json({ autoLockTimeout: parseInt(autoLockTimeout, 10) });
});

// Update settings
app.put("/api/vault/settings", (req, res) => {
  const { autoLockTimeout } = req.body;
  if (autoLockTimeout !== undefined) {
    setSetting("auto_lock_timeout", autoLockTimeout);
  }
  res.json({ success: true });
});

// ─── Backup/Restore Routes ────────────────────────────────────────────────────

// Export backup
app.get("/api/vault/backup", (req, res) => {
  const auth = db.prepare("SELECT * FROM vault_auth WHERE id = 1").get();
  if (!auth) {
    return res.status(404).json({ error: "Vault not initialized" });
  }

  const entries = db.prepare("SELECT * FROM vault_entries ORDER BY created_at ASC").all();

  const backup = {
    version: "1.0",
    timestamp: Date.now(),
    auth: {
      salt: auth.salt,
      pinHash: auth.pin_hash,
    },
    entries: entries.map((e) => ({
      id: e.id,
      category: e.category,
      title: e.title,
      encryptedContent: e.encrypted_content,
      iv: e.iv,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    })),
  };

  res.setHeader("Content-Disposition", `attachment; filename="mobilevault-backup-${backup.timestamp}.json"`);
  res.setHeader("Content-Type", "application/json");
  res.json(backup);
});

// Import backup
app.post("/api/vault/backup/import", (req, res) => {
  const { backup } = req.body;

  if (!backup || !backup.version || !backup.auth || !backup.entries) {
    return res.status(400).json({ error: "Invalid backup format" });
  }

  const existing = db.prepare("SELECT id FROM vault_auth WHERE id = 1").get();
  if (existing) {
    return res.status(409).json({ error: "Vault already exists. Wipe data first." });
  }

  const importTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO vault_auth (id, is_setup, salt, pin_hash)
      VALUES (1, 1, ?, ?)
    `).run(backup.auth.salt, backup.auth.pinHash);

    const insertEntry = db.prepare(`
      INSERT INTO vault_entries (id, category, title, encrypted_content, iv, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const entry of backup.entries) {
      insertEntry.run(
        entry.id,
        entry.category,
        entry.title,
        entry.encryptedContent,
        entry.iv,
        entry.createdAt,
        entry.updatedAt
      );
    }
  });

  importTx();
  res.json({ success: true, entriesImported: backup.entries.length });
});

// ─── SPA Fallback ─────────────────────────────────────────────────────────────

app.get("*", (req, res) => {
  const indexPath = join(DIST_DIR, "index.html");
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).send("Frontend not built. Run 'pnpm build' first.");
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🔒 MobileVault RPi Server`);
  console.log(`   Running on: http://0.0.0.0:${PORT}`);
  console.log(`   Database:   ${DB_PATH}`);
  console.log(`   Press Ctrl+C to stop\n`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[INFO] Shutting down...");
  db.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  db.close();
  process.exit(0);
});
