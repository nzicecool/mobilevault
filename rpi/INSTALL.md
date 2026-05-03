# MobileVault — Raspberry Pi Installation Guide

This guide walks you through installing and running **MobileVault** on a Raspberry Pi as a self-hosted, offline-capable personal information vault. All data is stored in a local SQLite database on your RPi — no cloud, no external servers.

---

## Architecture Overview

```
Your Phone / Browser
        │
        │  (Wi-Fi — local network only)
        ▼
Raspberry Pi (Node.js + Express)
        │
        ▼
  SQLite Database
  /home/pi/mobilevault/data/mobilevault.db
```

Your phone connects to the RPi over your local Wi-Fi network. The RPi serves the MobileVault PWA and stores all encrypted vault data in a local SQLite database. **Nothing leaves your home network.**

---

## Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Raspberry Pi | RPi 3B | RPi 4 (2GB+) |
| OS | Raspberry Pi OS Lite (64-bit) | Raspberry Pi OS (64-bit) |
| Storage | 8 GB SD card | 32 GB SD card or USB SSD |
| RAM | 512 MB | 1 GB+ |
| Network | Wi-Fi or Ethernet | Ethernet (more stable) |
| Node.js | v18.x | v20.x LTS |

---

## Step 1: Prepare Your Raspberry Pi

### 1.1 Flash Raspberry Pi OS

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Select **Raspberry Pi OS Lite (64-bit)** (no desktop needed)
3. Click the gear icon ⚙️ and configure:
   - Hostname: `mobilevault`
   - Enable SSH
   - Set username: `pi` and a strong password
   - Configure Wi-Fi (SSID and password)
4. Flash to your SD card and boot the RPi

### 1.2 Connect to Your RPi

```bash
# From your computer
ssh pi@mobilevault.local
# Or use the IP address if hostname doesn't resolve
ssh pi@192.168.x.x
```

### 1.3 Update the System

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential
```

---

## Step 2: Install Node.js

```bash
# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

---

## Step 3: Install MobileVault

### Option A: Clone from GitHub (Recommended)

```bash
# Clone the repository
cd /home/pi
git clone https://github.com/nzicecool/mobilevault.git
cd mobilevault

# Install dependencies
npm install

# Build the frontend
npm run build
```

### Option B: Copy Pre-built Package

If you have already built the project on another machine:

```bash
# On your development machine, build first:
# pnpm run build

# Then copy the deploy package to your RPi:
scp -r rpi/deploy pi@mobilevault.local:/home/pi/mobilevault

# On the RPi, install dependencies:
cd /home/pi/mobilevault
npm install
```

---

## Step 4: Configure the Server

### 4.1 Create Data Directory

```bash
mkdir -p /home/pi/mobilevault/data
chmod 700 /home/pi/mobilevault/data
```

### 4.2 Test the Server

```bash
cd /home/pi/mobilevault
node rpi/server.mjs
```

You should see:
```
🔒 MobileVault RPi Server
   Running on: http://0.0.0.0:3000
   Database:   /home/pi/mobilevault/data/mobilevault.db
   Press Ctrl+C to stop
```

Open your phone's browser and navigate to `http://mobilevault.local:3000` (or the RPi's IP address). You should see the MobileVault setup screen.

Press `Ctrl+C` to stop the server.

---

## Step 5: Run as a System Service (Auto-Start)

This configures MobileVault to start automatically when the RPi boots.

### 5.1 Copy the Service File

```bash
sudo cp /home/pi/mobilevault/rpi/mobilevault.service /etc/systemd/system/
```

### 5.2 Edit the Service File (if needed)

```bash
sudo nano /etc/systemd/system/mobilevault.service
```

Verify these paths match your installation:
```ini
WorkingDirectory=/home/pi/mobilevault
ExecStart=/usr/bin/node /home/pi/mobilevault/rpi/server.mjs
Environment=DATA_DIR=/home/pi/mobilevault/data
```

### 5.3 Enable and Start the Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start on boot
sudo systemctl enable mobilevault

# Start the service now
sudo systemctl start mobilevault

# Check status
sudo systemctl status mobilevault
```

You should see `Active: active (running)`.

### 5.4 View Logs

```bash
# Live logs
sudo journalctl -u mobilevault -f

# Last 50 lines
sudo journalctl -u mobilevault -n 50
```

---

## Step 6: Access MobileVault

### From Your Phone

1. Connect your phone to the **same Wi-Fi network** as the RPi
2. Open your browser and navigate to:
   ```
   http://mobilevault.local:3000
   ```
   Or use the RPi's IP address:
   ```
   http://192.168.x.x:3000
   ```

3. **Install as PWA** (optional but recommended):
   - **iOS Safari**: Tap Share → "Add to Home Screen"
   - **Android Chrome**: Tap menu → "Add to Home Screen" or "Install App"

4. Complete the setup by creating your 6-digit PIN

### Find Your RPi's IP Address

```bash
# On the RPi
hostname -I

# Or from your router's admin panel, look for "mobilevault"
```

---

## Step 7: Optional — Use a Custom Port

To run on port 80 (no port number in URL):

```bash
# Edit the service file
sudo nano /etc/systemd/system/mobilevault.service

# Change the Environment line:
Environment=PORT=80

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart mobilevault
```

Then access via `http://mobilevault.local` (no port needed).

> **Note:** Ports below 1024 require root privileges. Alternatively, use a reverse proxy like Nginx (see below).

---

## Step 8: Optional — Nginx Reverse Proxy (HTTPS)

For HTTPS access (required for biometric features on some browsers):

### 8.1 Install Nginx

```bash
sudo apt install -y nginx
```

### 8.2 Create Nginx Config

```bash
sudo nano /etc/nginx/sites-available/mobilevault
```

Paste:
```nginx
server {
    listen 80;
    server_name mobilevault.local;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 8.3 Enable and Restart

```bash
sudo ln -s /etc/nginx/sites-available/mobilevault /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Database Management

### Location

```
/home/pi/mobilevault/data/mobilevault.db
```

### Backup the Database

```bash
# Create a backup
cp /home/pi/mobilevault/data/mobilevault.db \
   /home/pi/mobilevault/data/mobilevault.db.backup-$(date +%Y%m%d)

# Or use SQLite's backup command
sqlite3 /home/pi/mobilevault/data/mobilevault.db ".backup /home/pi/backup.db"
```

### Restore from Backup

```bash
# Stop the service first
sudo systemctl stop mobilevault

# Restore
cp /home/pi/backup.db /home/pi/mobilevault/data/mobilevault.db

# Restart
sudo systemctl start mobilevault
```

### View Database Contents (for debugging)

```bash
# Install SQLite CLI
sudo apt install -y sqlite3

# Open the database
sqlite3 /home/pi/mobilevault/data/mobilevault.db

# Useful queries
.tables                          -- List all tables
SELECT * FROM vault_settings;    -- View settings
SELECT id, category, title FROM vault_entries;  -- List entries (encrypted content hidden)
.quit
```

---

## Updating MobileVault

```bash
# Pull latest changes
cd /home/pi/mobilevault
git pull origin main

# Rebuild frontend
npm install
npm run build

# Restart service
sudo systemctl restart mobilevault
```

---

## Troubleshooting

### Service Won't Start

```bash
sudo journalctl -u mobilevault -n 50 --no-pager
```

Common causes:
- Node.js not found: check `which node` and update `ExecStart` path
- Port already in use: change `PORT` in service file
- Permission denied on data dir: `chmod 700 /home/pi/mobilevault/data`

### Can't Access from Phone

1. Verify RPi and phone are on the same network
2. Check the service is running: `sudo systemctl status mobilevault`
3. Test locally on RPi: `curl http://localhost:3000`
4. Check firewall: `sudo ufw status` — if active, allow port 3000:
   ```bash
   sudo ufw allow 3000/tcp
   ```

### Database Errors

```bash
# Check database integrity
sqlite3 /home/pi/mobilevault/data/mobilevault.db "PRAGMA integrity_check;"
```

### Reset Everything (Fresh Install)

```bash
sudo systemctl stop mobilevault
rm /home/pi/mobilevault/data/mobilevault.db
sudo systemctl start mobilevault
```

---

## Security Recommendations

1. **Change default SSH password**: `passwd pi`
2. **Use SSH keys instead of passwords**: More secure for remote access
3. **Keep RPi updated**: `sudo apt update && sudo apt upgrade -y` monthly
4. **Don't expose to internet**: Keep MobileVault on your local network only
5. **Regular database backups**: Schedule a cron job for automatic backups:
   ```bash
   # Add to crontab: crontab -e
   0 2 * * * cp /home/pi/mobilevault/data/mobilevault.db /home/pi/backups/mobilevault-$(date +\%Y\%m\%d).db
   ```
6. **Encrypt the SD card**: Consider full-disk encryption for maximum security

---

## Quick Reference

| Task | Command |
|------|---------|
| Start service | `sudo systemctl start mobilevault` |
| Stop service | `sudo systemctl stop mobilevault` |
| Restart service | `sudo systemctl restart mobilevault` |
| View status | `sudo systemctl status mobilevault` |
| View logs | `sudo journalctl -u mobilevault -f` |
| Enable auto-start | `sudo systemctl enable mobilevault` |
| Disable auto-start | `sudo systemctl disable mobilevault` |

---

*MobileVault — Store securely. Your data, your device.*
