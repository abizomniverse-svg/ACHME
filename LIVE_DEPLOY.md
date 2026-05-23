# ACHME Communication CRM — End-to-End Live Deployment Guide
## Ubuntu Server · Node.js · React · MySQL · Nginx (Port 82) · PM2 · LAN Access · achme.com Local Domain

> **Give this file to your AI assistant and say: "Follow every step exactly."**
> Every command, every line number, every file path is spelled out.
> Replace `192.168.1.100` with your actual server LAN IP wherever you see it.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Server Requirements & Pre-checks](#2-server-requirements--pre-checks)
3. [Step 1 — Fix Your Server's LAN IP (Static IP)](#3-step-1--fix-your-servers-lan-ip-static-ip)
4. [Step 2 — Install All Dependencies](#4-step-2--install-all-dependencies)
5. [Step 3 — Clone the Project](#5-step-3--clone-the-project)
6. [Step 4 — MySQL Database Setup](#6-step-4--mysql-database-setup)
7. [Step 5 — Backend .env Configuration](#7-step-5--backend-env-configuration)
8. [Step 6 — Install Backend Node Modules](#8-step-6--install-backend-node-modules)
9. [Step 7 — Build React Frontend](#9-step-7--build-react-frontend)
10. [Step 8 — Configure PM2 for Backend](#10-step-8--configure-pm2-for-backend)
11. [Step 9 — Configure Nginx (Port 82 + achme.com)](#11-step-9--configure-nginx-port-82--achmecom)
12. [Step 10 — Configure Local Domain (achme.com → IP)](#12-step-10--configure-local-domain-achmecom--ip)
13. [Step 11 — Firewall Setup](#13-step-11--firewall-setup)
14. [Step 12 — Verify Everything is Running](#14-step-12--verify-everything-is-running)
15. [Step 13 — Employee Access from LAN Devices](#15-step-13--employee-access-from-lan-devices)
16. [Step 14 — Socket.IO Real-time (Chat + Notifications)](#16-step-14--socketio-real-time-chat--notifications)
17. [Step 15 — Auto-start on Server Reboot](#17-step-15--auto-start-on-server-reboot)
18. [PM2 Cheatsheet](#18-pm2-cheatsheet)
19. [Nginx Cheatsheet](#19-nginx-cheatsheet)
20. [MySQL Cheatsheet](#20-mysql-cheatsheet)
21. [Full CRUD Verification Checklist](#21-full-crud-verification-checklist)
22. [Troubleshooting](#22-troubleshooting)
23. [Default Login Credentials](#23-default-login-credentials)
24. [Project Port Map Summary](#24-project-port-map-summary)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│              EMPLOYEE BROWSER (LAN WiFi)                 │
│  http://192.168.1.100:82  OR  http://achme.com           │
└───────────────────────────┬──────────────────────────────┘
                            │  Port 82
                            ▼
┌──────────────────────────────────────────────────────────┐
│                 NGINX (Port 82)                          │
│  /          → serves React build (static HTML/JS/CSS)   │
│  /api/      → proxy_pass → localhost:5000               │
│  /uploads/  → proxy_pass → localhost:5000/uploads       │
│  WebSocket  → proxy_pass → localhost:5000 (Socket.IO)   │
└───────────────────────────┬──────────────────────────────┘
                            │  Port 5000 (internal only)
                            ▼
┌──────────────────────────────────────────────────────────┐
│            NODE.JS / EXPRESS BACKEND                     │
│  Managed by PM2 (cluster mode, auto-restart)            │
│  Entry: /var/www/achme/backend/server.js                 │
│  Routes: /api/auth, /api/client, /api/invoice ...       │
│  Socket.IO: chat + notifications                        │
└───────────────────────────┬──────────────────────────────┘
                            │  Port 3306 (internal only)
                            ▼
┌──────────────────────────────────────────────────────────┐
│                 MYSQL DATABASE                           │
│  Database: achme                                         │
│  Auto-migrates tables on every backend start            │
│  Default admin: Kk@achmecommunication.com               │
└──────────────────────────────────────────────────────────┘
```

**What employees access:**
- Browser URL: `http://192.168.1.100:82` (or `http://achme.com` after hosts config)
- Frontend React app loads, calls `/api/...` which Nginx proxies to backend
- Real-time chat and notifications work over WebSocket through Nginx

---

## 2. Server Requirements & Pre-checks

**Minimum server specs:**
- Ubuntu 20.04 / 22.04 / 24.04 LTS (recommended)
- 2 CPU cores, 4 GB RAM (8 GB preferred for puppeteer PDF generation)
- 20 GB disk space
- Connected to office LAN WiFi/router

**Run this to check your current system:**
```bash
# Check Ubuntu version
lsb_release -a

# Check if ports 82 and 5000 are free
sudo ss -tlnp | grep -E ':82|:5000|:3306'

# Check server LAN IP
ip addr show | grep "inet " | grep -v "127.0.0.1"
# Example output: inet 192.168.1.100/24 → your server IP is 192.168.1.100
```

---

## 3. Step 1 — Fix Your Server's LAN IP (Static IP)

> Your server needs a fixed LAN IP so employees always reach the same address.

### Option A — Set Static IP on Ubuntu Server (Netplan method)

```bash
# Find your network interface name
ip link show
# Common names: eth0, enp0s3, ens33, wlan0

# Check current netplan config
ls /etc/netplan/
# Usually: 00-installer-config.yaml OR 01-netcfg.yaml
```

**Edit the netplan file:**
```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

**Replace the entire contents with this** (adjust interface name and IPs):
```yaml
# FILE: /etc/netplan/00-installer-config.yaml
# Line 1: network version
network:
  version: 2
  renderer: networkd
  ethernets:
    enp0s3:                        # ← Change to YOUR interface name
      dhcp4: no
      addresses:
        - 192.168.1.100/24         # ← Your chosen static IP
      routes:
        - to: default
          via: 192.168.1.1         # ← Your router/gateway IP
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

```bash
# Apply the network config
sudo netplan apply

# Verify the IP is set
ip addr show enp0s3
```

### Option B — Reserve IP in Router (Easier)

Log into your router admin panel (usually `http://192.168.1.1`), find
the DHCP settings, and assign a permanent/reserved IP to your server's
MAC address. Reboot the server after reserving.

---

## 4. Step 2 — Install All Dependencies

Run these commands one by one on the **server terminal**:

### 2a — Update system
```bash
sudo apt update && sudo apt upgrade -y
```

### 2b — Install Node.js 20 LTS
```bash
# Install Node.js using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version    # Should be v20.x.x
npm --version     # Should be 10.x.x
```

### 2c — Install MySQL 8
```bash
sudo apt install -y mysql-server

# Start and enable MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Verify MySQL is running
sudo systemctl status mysql
```

### 2d — Secure MySQL and create database user
```bash
# Run security setup (press Enter for defaults, set root password)
sudo mysql_secure_installation
# Answer: Y, Y, Y, Y, Y

# Log in as root
sudo mysql -u root -p
```

Inside MySQL shell, run these SQL commands:
```sql
-- Create the application database
CREATE DATABASE IF NOT EXISTS achme DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated app user (more secure than using root)
CREATE USER IF NOT EXISTS 'achme_user'@'localhost' IDENTIFIED BY 'AchmeSecure@2024';
GRANT ALL PRIVILEGES ON achme.* TO 'achme_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
SELECT user, host FROM mysql.user;
EXIT;
```

### 2e — Install PM2 globally
```bash
sudo npm install -g pm2

# Verify
pm2 --version
```

### 2f — Install Nginx
```bash
sudo apt install -y nginx

# Start and enable
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify
sudo systemctl status nginx
nginx -v
```

### 2g — Install Git
```bash
sudo apt install -y git

# Verify
git --version
```

---

## 5. Step 3 — Clone the Project

```bash
# Create deployment directory
sudo mkdir -p /var/www/achme
sudo chown -R $USER:$USER /var/www/achme

# Clone from GitHub
cd /var/www
git clone https://github.com/Ananth-madura/ACHME_COMUNICATION.git achme

# Verify structure
ls /var/www/achme
# Should show: backend/  frontend/  server-deployment/  README.md  ...

ls /var/www/achme/backend
# Should show: server.js  routes/  config/  package.json  ...

ls /var/www/achme/frontend
# Should show: src/  public/  package.json  ...
```

---

## 6. Step 4 — MySQL Database Setup

The backend **auto-creates all tables** on first start (see `config/database.js`).
You only need the database to exist. But run this to confirm:

```bash
sudo mysql -u root -p
```

```sql
-- Check database exists
SHOW DATABASES;
-- You should see: achme

-- Grant permissions to app user if not done yet
GRANT ALL PRIVILEGES ON achme.* TO 'achme_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**If you want to import an existing database dump:**
```bash
# Import existing SQL dump (if you have one)
sudo mysql -u root -p achme < /path/to/your/dump.sql
```

---

## 7. Step 5 — Backend .env Configuration

```bash
# Go to backend directory
cd /var/www/achme/backend

# Create .env from example
cp .env.example .env

# Edit the .env file
nano .env
```

**Replace the ENTIRE contents of `/var/www/achme/backend/.env` with:**
```env
# ============================================================
# FILE: /var/www/achme/backend/.env
# ============================================================

# Server Configuration
PORT=5000
NODE_ENV=production

# ⚠️ IMPORTANT: Set this to your server's LAN IP
# This allows all LAN devices to call the API
ALLOWED_ORIGIN=http://192.168.1.100:82,http://achme.com

# Database Configuration
# Use 'achme_user' (more secure) or 'root' if you skipped user creation
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=achme_user
DB_PASS=AchmeSecure@2024
DB_NAME=achme

# Email Configuration (Gmail App Password)
# Get app password from: https://myaccount.google.com/apppasswords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=thanan757@gmail.com
EMAIL_PASS=ghjv omqm hwji kerq

# JWT Secret — generate a new one for production:
# Run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=97418d0c15d57ade768586b8501e35d34e5a5277f2a0570b6d5b47ef93f5b33e88b80045c60efd77e6edcbb015dbe46cf6747ce1dd8f11361f3e426ddc677c9a

DEFAULT_TEST_PASSWORD=Test@12345
```

> **Key lines to note:**
> - Line 8: `ALLOWED_ORIGIN` — must include your LAN IP:port AND domain
> - Line 12: `DB_USER` — use `achme_user` or `root`
> - Line 13: `DB_PASS` — your MySQL password
> - Line 14: `DB_NAME` — must be `achme`

```bash
# Verify the file looks correct
cat /var/www/achme/backend/.env
```

---

## 8. Step 6 — Install Backend Node Modules

```bash
cd /var/www/achme/backend

# Install all production dependencies
npm install

# ⚠️ Puppeteer (used for PDF generation) needs Chromium deps
# Install them to avoid PDF failures:
sudo apt install -y \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2

# Verify install succeeded
ls node_modules | head -20
```

---

## 9. Step 7 — Build React Frontend

> The React app in production mode calls the backend via **relative `/api/`** paths.
> Nginx serves the static build AND proxies `/api/` to the Node backend.
> This means the frontend never hardcodes an IP — it works from any LAN device.

```bash
cd /var/www/achme/frontend

# Create frontend .env for production build
nano .env.production
```

**Contents of `/var/www/achme/frontend/.env.production`:**
```env
# FILE: /var/www/achme/frontend/.env.production
# In production, API calls go to relative /api path (Nginx handles proxy)
# Leave REACT_APP_API_URL empty so config/index.js returns "" for production
REACT_APP_API_URL=
```

```bash
# Install frontend dependencies
npm install

# Build the production bundle
# This creates /var/www/achme/frontend/build/
npm run build

# Verify build succeeded
ls /var/www/achme/frontend/build
# Should show: index.html  static/  favicon.ico  manifest.json  ...

ls /var/www/achme/frontend/build/static/js
# Should show: main.xxxxx.js  (the compiled React bundle)
```

> **What happens during build:**
> - React is compiled into static HTML + JS + CSS files in `frontend/build/`
> - `src/config/index.js` returns `""` for production (empty string)
> - All API calls become `/api/...` — no hardcoded IP
> - Nginx serves `build/` as static files and proxies `/api/` to port 5000

---

## 10. Step 8 — Configure PM2 for Backend

### Create PM2 Ecosystem File

```bash
# Create a fresh ecosystem file for Linux deployment
nano /var/www/achme/ecosystem.config.js
```

**Complete contents of `/var/www/achme/ecosystem.config.js`:**
```javascript
// FILE: /var/www/achme/ecosystem.config.js
// PM2 process manager configuration for ACHME CRM backend

module.exports = {
  apps: [
    {
      // ── App identity ────────────────────────────────────────
      name: 'achme-backend',
      script: '/var/www/achme/backend/server.js',

      // ── Cluster mode: one worker per CPU core ──────────────
      instances: 2,          // Use 2 workers (safe for 2-core server)
      exec_mode: 'cluster',  // Enable Node.js cluster mode

      // ── Reliability ─────────────────────────────────────────
      autorestart: true,
      watch: false,           // Never watch files in production
      max_memory_restart: '800M',

      // ── Environment variables ────────────────────────────────
      // These override .env if needed, or .env values take priority
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        DB_HOST: '127.0.0.1',
        DB_PORT: 3306,
        DB_USER: 'achme_user',
        DB_PASS: 'AchmeSecure@2024',
        DB_NAME: 'achme',
      },

      // ── Logging ──────────────────────────────────────────────
      error_file: '/var/log/achme/backend-error.log',
      out_file:   '/var/log/achme/backend-out.log',
      merge_logs: true,
      time: true,             // Prepend timestamps to logs

      // ── Graceful shutdown ────────────────────────────────────
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    }
  ]
};
```

```bash
# Create log directory
sudo mkdir -p /var/log/achme
sudo chown -R $USER:$USER /var/log/achme

# Start backend with PM2 using production env
pm2 start /var/www/achme/ecosystem.config.js --env production

# Check it started successfully
pm2 status
# Should show: achme-backend | online | 2 instances

# View live logs
pm2 logs achme-backend --lines 50
# Should see: ✅ Server running: http://0.0.0.0:5000
# Should see: MySQL Connected (127.0.0.1:3306)
# Should see: Database initialized successfully
# Should see: Default employees seeded successfully.

# Test the backend is responding
curl http://localhost:5000/api/health
# Expected: {"ok":true,"database":"ready","uptime":...}
```

---

## 11. Step 9 — Configure Nginx (Port 82 + achme.com)

### Remove default Nginx site
```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

### Create ACHME Nginx config
```bash
sudo nano /etc/nginx/sites-available/achme
```

**Complete contents of `/etc/nginx/sites-available/achme`:**
```nginx
# FILE: /etc/nginx/sites-available/achme
# ACHME Communication CRM - Nginx Configuration
# Serves React build on port 82, proxies /api/ to Node.js on port 5000
# Supports: http://192.168.1.100:82 AND http://achme.com

server {
    # ── Listen on port 82 for LAN IP access ─────────────────────
    listen 82;
    listen [::]:82;

    # ── Accept both IP and local domain name ─────────────────────
    # Change 192.168.1.100 to your actual server LAN IP
    server_name 192.168.1.100 achme.com www.achme.com localhost;

    # ── React build static files ─────────────────────────────────
    root /var/www/achme/frontend/build;
    index index.html;

    # ── Logging ──────────────────────────────────────────────────
    access_log /var/log/nginx/achme-access.log;
    error_log  /var/log/nginx/achme-error.log;

    # ── Increase upload size (for image/PDF uploads) ─────────────
    client_max_body_size 50M;

    # ── React SPA: serve index.html for all frontend routes ──────
    # This allows React Router (BrowserRouter) to handle routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ── Static assets caching (JS, CSS, images) ──────────────────
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/achme/frontend/build;
        expires 7d;
        add_header Cache-Control "public, no-transform";
        try_files $uri =404;
    }

    # ── Proxy ALL /api/ requests to Node.js backend ──────────────
    location /api/ {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;

        # WebSocket upgrade headers (needed for Socket.IO)
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";

        # Forward real client IP to backend
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # Timeouts (backend may take time for PDF generation)
        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    120s;

        # Disable caching for API responses
        proxy_cache_bypass  $http_upgrade;
        add_header          Cache-Control "no-store";
    }

    # ── Proxy /uploads/ (backend file uploads: images, PDFs) ─────
    location /uploads/ {
        proxy_pass         http://127.0.0.1:5000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        expires 1d;
    }

    # ── Socket.IO WebSocket endpoint (chat + notifications) ──────
    location /socket.io/ {
        proxy_pass         http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       $host;
        proxy_set_header   X-Real-IP  $remote_addr;

        # Long-lived WebSocket connections need longer timeout
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # ── Block access to hidden files (.env, .git, etc.) ──────────
    location ~ /\. {
        deny all;
        return 404;
    }
}
```

### Enable the site and test
```bash
# Enable the site
sudo ln -sf /etc/nginx/sites-available/achme /etc/nginx/sites-enabled/achme

# Test Nginx config for syntax errors
sudo nginx -t
# Expected: nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reload Nginx (no downtime)
sudo systemctl reload nginx

# Verify Nginx is running
sudo systemctl status nginx

# Confirm port 82 is listening
sudo ss -tlnp | grep :82
# Expected: LISTEN 0 511 0.0.0.0:82 0.0.0.0:* users:(("nginx"...))
```

---

## 12. Step 10 — Configure Local Domain (achme.com → IP)

To allow employees to type `http://achme.com` instead of the IP, you have
two options:

### Option A — Configure Each Employee's PC hosts file (simplest)

Tell employees to add one line to their hosts file:

**On Windows** (on each employee PC):
```
# Open Notepad as Administrator
# File → Open: C:\Windows\System32\drivers\etc\hosts
# Add this line at the bottom:
192.168.1.100    achme.com    www.achme.com
```
Save the file. No restart needed — open browser and go to `http://achme.com`.

**On Mac/Linux** (on each employee machine):
```bash
sudo nano /etc/hosts
# Add this line:
192.168.1.100    achme.com    www.achme.com
# Save with Ctrl+O, Exit with Ctrl+X
```

### Option B — Configure Router DNS (All devices instantly, no per-PC config)

1. Log into your office router admin (`http://192.168.1.1` usually)
2. Find **DNS** or **LAN DNS** or **Custom DNS** settings
3. Add a custom DNS entry:
   - Hostname: `achme.com`
   - IP: `192.168.1.100`
4. Save and reboot router
5. All LAN devices now resolve `achme.com` to your server automatically

### Option C — Pi-hole or dnsmasq (Advanced, works for entire network)

```bash
# Install dnsmasq on the server itself as a local DNS
sudo apt install -y dnsmasq

# Add custom DNS entry
sudo nano /etc/dnsmasq.conf
# Add this line:
address=/achme.com/192.168.1.100

# Restart dnsmasq
sudo systemctl restart dnsmasq

# Point router to use this server as primary DNS: 192.168.1.100
```

---

## 13. Step 11 — Firewall Setup

```bash
# Enable UFW (Ubuntu firewall)
sudo ufw enable

# Allow SSH (so you don't lock yourself out)
sudo ufw allow 22/tcp

# Allow port 82 for LAN access (Nginx)
sudo ufw allow 82/tcp

# Allow port 80 (optional, for future HTTPS)
sudo ufw allow 80/tcp

# Block direct access to backend and MySQL from outside
# (These ports should only be accessible internally)
# Port 5000 — NOT opened externally, Nginx proxies internally
# Port 3306 — NOT opened externally, backend connects internally

# Check firewall status
sudo ufw status verbose
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
82/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
```

---

## 14. Step 12 — Verify Everything is Running

Run these checks in order:

```bash
# ── Check 1: MySQL is running ────────────────────────────────────
sudo systemctl status mysql | grep Active
# Expected: Active: active (running)

# ── Check 2: Backend is up ───────────────────────────────────────
pm2 status
# Expected: achme-backend | online

curl http://localhost:5000/api/health
# Expected: {"ok":true,"database":"ready","uptime":...}

# ── Check 3: Nginx is running on port 82 ─────────────────────────
sudo systemctl status nginx | grep Active
# Expected: Active: active (running)

sudo ss -tlnp | grep ':82'
# Expected: LISTEN ... 0.0.0.0:82

# ── Check 4: Frontend is served ──────────────────────────────────
curl -I http://localhost:82/
# Expected: HTTP/1.1 200 OK  Content-Type: text/html

# ── Check 5: API proxy works through Nginx ───────────────────────
curl http://localhost:82/api/health
# Expected: {"ok":true,"database":"ready","uptime":...}

# ── Check 6: From LAN device (replace with your IP) ─────────────
curl http://192.168.1.100:82/api/health
# Expected: {"ok":true,"database":"ready","uptime":...}

# ── Check 7: Database has tables ─────────────────────────────────
sudo mysql -u achme_user -p achme -e "SHOW TABLES;"
# Expected: List of 30+ tables (users, clients, telecalls, etc.)
```

---

## 15. Step 13 — Employee Access from LAN Devices

### What employees should do:

**Connect to the same office WiFi** as the server, then open any browser and go to:

```
http://192.168.1.100:82
```
or (after hosts file / DNS setup):
```
http://achme.com
```

### Login credentials for employees:

| Role | Email | Password |
|------|-------|----------|
| Admin | `Kk@achmecommunication.com` | `kk@admin@123` |
| Employee (Princee) | `info@achmecommunication.com` | `Achme@Princee` |
| Employee (Vimal) | `sales1@technostore.co.in` | `Achme@Vimal` |
| Employee (Moorthi) | `sales5@technostore.co.in` | `Achme@Moorthi` |
| Employee (Uma) | `uma@achmecommunication.com` | `Achme@Uma` |
| Employee (Nagaraj) | `nagaraj@technostore.co.in` | `Achme@Nagaraj` |
| Employee (Priyanka) | `service@achmecommunication.com` | `Achme@Priyanka` |

> Passwords are set by `backend/config/database.js` → `seedDefaultEmployees()`.
> Format: `Achme@{FirstName}` for all employees.

---

## 16. Step 14 — Socket.IO Real-time (Chat + Notifications)

The app uses Socket.IO for:
- **Real-time chat** (`/socket.io/` → `backend/sockets/chatsockets.js`)
- **Live notifications** (`/socket.io/` → `backend/sockets/notifications.js`)
- **Live data updates** (backend emits `data_changed` on every POST/PUT/DELETE)

**How it works through Nginx:**

```
Browser WebSocket → http://192.168.1.100:82/socket.io/
     ↓ (Nginx upgrades HTTP → WebSocket)
Nginx proxy_pass → http://127.0.0.1:5000/socket.io/
     ↓
Socket.IO server in Node.js
```

**Key Nginx lines for WebSocket** (already in config above):
```nginx
# In /api/ and /socket.io/ location blocks:
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

**Verify Socket.IO is working:**
```bash
# Check Socket.IO is responding
curl http://localhost:5000/socket.io/?EIO=4&transport=polling
# Expected: 0{"sid":"...","upgrades":["websocket"],...}
```

**Frontend socket config** (`frontend/src/socket/socket.js`):
```javascript
// In production, API = "" (empty string), so socketUrl = ""
// This means Socket.IO connects to the same origin: http://192.168.1.100:82
// Nginx proxies /socket.io/ to the backend — it all works automatically
const socket = io(socketUrl, {
  transports: ["websocket"],
  reconnection: true
});
```

---

## 17. Step 15 — Auto-start on Server Reboot

If the server restarts, PM2 and Nginx should come back up automatically.

```bash
# ── Configure PM2 to auto-start on boot ─────────────────────────
pm2 save              # Save current process list
pm2 startup           # Generate startup script command

# PM2 will print a command like:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
# COPY AND RUN THAT EXACT COMMAND

# Example (run the command PM2 gave you):
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# Save PM2 process list again after startup config
pm2 save

# ── Nginx auto-start (already set in Step 2) ────────────────────
sudo systemctl is-enabled nginx
# Expected: enabled

# ── MySQL auto-start (already set in Step 2) ────────────────────
sudo systemctl is-enabled mysql
# Expected: enabled

# ── Test full reboot recovery ────────────────────────────────────
sudo reboot

# After reboot, wait 30 seconds, then SSH back in:
pm2 status
# Expected: achme-backend | online
sudo systemctl status nginx
# Expected: active (running)
sudo systemctl status mysql
# Expected: active (running)
```

---

## 18. PM2 Cheatsheet

```bash
# ── Status & Monitoring ──────────────────────────────────────────
pm2 status                          # Show all processes
pm2 monit                           # Real-time CPU/RAM dashboard
pm2 logs achme-backend              # Live logs for ACHME backend
pm2 logs achme-backend --lines 100  # Last 100 lines of logs
pm2 logs --err                      # Show only error logs

# ── Process Control ──────────────────────────────────────────────
pm2 restart achme-backend           # Restart (zero downtime)
pm2 reload achme-backend            # Graceful reload (cluster mode)
pm2 stop achme-backend              # Stop the process
pm2 start achme-backend             # Start the process
pm2 delete achme-backend            # Remove from PM2 list

# ── Starting with ecosystem file ────────────────────────────────
pm2 start /var/www/achme/ecosystem.config.js --env production
pm2 restart ecosystem.config.js     # Restart from ecosystem file

# ── After code updates ───────────────────────────────────────────
cd /var/www/achme
git pull origin main
pm2 restart achme-backend           # Restart backend after code change

# If frontend changed, also rebuild:
cd /var/www/achme/frontend
npm run build
# No PM2 restart needed — Nginx serves static files directly
```

---

## 19. Nginx Cheatsheet

```bash
# ── Config & Testing ─────────────────────────────────────────────
sudo nginx -t                        # Test config for errors
sudo nano /etc/nginx/sites-available/achme  # Edit ACHME config

# ── Reload & Restart ─────────────────────────────────────────────
sudo systemctl reload nginx          # Reload config (no downtime)
sudo systemctl restart nginx         # Full restart
sudo systemctl status nginx          # Check status

# ── Logs ─────────────────────────────────────────────────────────
sudo tail -f /var/log/nginx/achme-access.log   # Live access log
sudo tail -f /var/log/nginx/achme-error.log    # Live error log
sudo tail -f /var/log/nginx/error.log           # Nginx system errors

# ── Debugging ────────────────────────────────────────────────────
sudo nginx -T                        # Show full compiled config
sudo ss -tlnp | grep nginx           # Show what ports Nginx uses

# ── After changes to /etc/nginx/sites-available/achme ───────────
sudo nginx -t && sudo systemctl reload nginx
```

---

## 20. MySQL Cheatsheet

```bash
# ── Connect ──────────────────────────────────────────────────────
sudo mysql -u root -p                         # Connect as root
mysql -u achme_user -p achme                  # Connect as app user

# ── Database Operations ──────────────────────────────────────────
SHOW DATABASES;                               # List all databases
USE achme;                                    # Switch to achme DB
SHOW TABLES;                                  # List all tables
DESCRIBE users;                               # Show users table columns
SELECT COUNT(*) FROM clients;                 # Count clients
SELECT * FROM users LIMIT 5;                  # View first 5 users

# ── Backup & Restore ─────────────────────────────────────────────
# Backup:
mysqldump -u achme_user -p achme > /var/backups/achme_$(date +%F).sql

# Restore:
mysql -u achme_user -p achme < /var/backups/achme_2024-01-01.sql

# ── Fix permissions if backend can't connect ─────────────────────
sudo mysql -u root -p
GRANT ALL PRIVILEGES ON achme.* TO 'achme_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# ── Check MySQL is listening on 3306 ────────────────────────────
sudo ss -tlnp | grep :3306
```

---

## 21. Full CRUD Verification Checklist

Open `http://192.168.1.100:82` in the browser and test each module:

### Authentication
- [ ] Login with admin credentials → redirects to admin dashboard
- [ ] Login with employee credentials → redirects to user dashboard
- [ ] Logout → returns to login page
- [ ] Register new user → admin sees notification

### Clients Module (`/api/client`)
- [ ] **CREATE**: Add new client (name, phone, company, city)
- [ ] **READ**: View clients list, search by name
- [ ] **UPDATE**: Edit client details
- [ ] **DELETE**: Remove a client

### Telecalls Module (`/api/Telecalls`)
- [ ] **CREATE**: Add new telecall entry
- [ ] **READ**: View telecalls with filters (date, staff, outcome)
- [ ] **UPDATE**: Update call status (New/Hot Case/Warm Case/Cold Case/Converted)
- [ ] **DELETE**: Delete a telecall

### Walk-ins Module (`/api/Walkins`)
- [ ] **CREATE**: Log a walk-in visit
- [ ] **READ**: View walk-in list
- [ ] **UPDATE**: Update walk-in status
- [ ] **DELETE**: Remove walk-in entry

### Quotations Module (`/api/quotations`)
- [ ] **CREATE**: Generate new quotation with line items, GST
- [ ] **READ**: View and preview quotation
- [ ] **UPDATE**: Revise quotation (creates new version)
- [ ] **DELETE**: Delete quotation
- [ ] PDF download works

### Invoices Module (`/api/invoice`, `/api/performainvoice`, `/api/estimate-invoice`)
- [ ] **CREATE**: Create invoice with items, tax, bank details
- [ ] **READ**: View invoice list and preview
- [ ] **UPDATE**: Edit invoice
- [ ] PDF generation & download works

### Contracts & AMC (`/api/contract`, `/api/amc`)
- [ ] **CREATE**: New contract/AMC entry
- [ ] **READ**: View contract list with service history
- [ ] **UPDATE**: Update contract status
- [ ] **DELETE**: Remove contract

### Call Reports (`/api/call-reports`)
- [ ] **CREATE**: Log service call with duration, expenses
- [ ] **READ**: View reports with date filters
- [ ] **UPDATE**: Update call status
- [ ] **DELETE**: Delete report

### Team Management (`/api/teammember`, `/api/auth`)
- [ ] **CREATE**: Add new team member
- [ ] **READ**: View team list
- [ ] **UPDATE**: Edit team member details
- [ ] **DELETE**: Remove team member

### Tasks (`/api/task`)
- [ ] **CREATE**: Create and assign task
- [ ] **READ**: View tasks by status
- [ ] **UPDATE**: Update task progress
- [ ] **DELETE**: Delete task

### Targets & Reports (`/api/targets`, `/api/reports`)
- [ ] **CREATE**: Set monthly/yearly targets
- [ ] **READ**: View achievement reports
- [ ] **UPDATE**: Update target values

### Real-time Chat (`/socket.io/`)
- [ ] Open chat from two different browser tabs
- [ ] Send message from Tab 1 → appears instantly in Tab 2
- [ ] Notification bell updates without page refresh

---

## 22. Troubleshooting

### Problem: Backend won't start — "Missing required environment variables"
```bash
# Check .env file exists and has all required keys
cat /var/www/achme/backend/.env | grep -E "DB_HOST|DB_USER|DB_PASS|DB_NAME|JWT_SECRET"

# All 5 must have values — if any are empty/missing:
nano /var/www/achme/backend/.env
# Fill in the missing values, save, then:
pm2 restart achme-backend
pm2 logs achme-backend
```

### Problem: "Port 5000 is already in use"
```bash
# Find what's using port 5000
sudo lsof -i :5000

# Kill it if needed (replace PID with actual process ID)
sudo kill -9 <PID>

# Restart PM2
pm2 restart achme-backend
```

### Problem: Frontend builds but shows blank page / white screen
```bash
# Check browser console for errors (F12 → Console tab)
# Usually caused by wrong API URL or CORS error

# Re-check frontend .env.production
cat /var/www/achme/frontend/.env.production
# Should have: REACT_APP_API_URL= (empty)

# Rebuild frontend
cd /var/www/achme/frontend
npm run build

# Clear Nginx cache and reload
sudo systemctl reload nginx
```

### Problem: API calls return 502 Bad Gateway
```bash
# Means Nginx can't reach Node.js backend
pm2 status
# If backend is offline:
pm2 start /var/www/achme/ecosystem.config.js --env production

# Check backend health
curl http://localhost:5000/api/health

# Check Nginx error log for details
sudo tail -50 /var/log/nginx/achme-error.log
```

### Problem: "Access denied for user" (MySQL connection error)
```bash
sudo mysql -u root -p

# Inside MySQL:
GRANT ALL PRIVILEGES ON achme.* TO 'achme_user'@'localhost' IDENTIFIED BY 'AchmeSecure@2024';
FLUSH PRIVILEGES;
EXIT;

pm2 restart achme-backend
pm2 logs achme-backend --lines 20
```

### Problem: Employees can't reach the server from their browsers
```bash
# On the server, check port 82 is listening
sudo ss -tlnp | grep ':82'

# Check firewall allows port 82
sudo ufw status
# If port 82 is not listed:
sudo ufw allow 82/tcp
sudo ufw reload

# Test from server itself
curl http://localhost:82

# Test from employee PC (if curl is available)
curl http://192.168.1.100:82

# If still not reachable, check if server and employee PCs are on same subnet
ip route
# Both should be on e.g. 192.168.1.x network
```

### Problem: Socket.IO / Chat not working (WebSocket errors)
```bash
# Check Nginx config has WebSocket headers
grep -A5 "socket.io" /etc/nginx/sites-available/achme
# Must show: proxy_set_header Upgrade $http_upgrade;
#            proxy_set_header Connection "upgrade";

# Test Socket.IO polling endpoint
curl "http://localhost:5000/socket.io/?EIO=4&transport=polling"
# Must return JSON with "sid" field

sudo nginx -t && sudo systemctl reload nginx
```

### Problem: PDF generation fails
```bash
# PDFs use Puppeteer (headless Chromium) — install missing deps:
sudo apt install -y libgbm1 libasound2 libatk-bridge2.0-0 libdrm2 libxkbcommon0

# Check backend logs for puppeteer errors
pm2 logs achme-backend | grep -i "puppeteer\|chrome\|pdf"
```

### Problem: Images not loading / 404 on /uploads/ paths
```bash
# Check uploads directory exists
ls /var/www/achme/backend/uploads/

# Verify Nginx /uploads/ proxy block is present
grep -A5 "location /uploads" /etc/nginx/sites-available/achme

# Test directly
curl http://localhost:82/uploads/
# Should return 200 or list, not 404
```

---

## 23. Default Login Credentials

| Field | Value |
|-------|-------|
| Admin Email | `Kk@achmecommunication.com` |
| Admin Password | `kk@admin@123` |
| Admin Emp ID | `ADMIN001` |

> These are seeded by `backend/config/database.js` → `seedDefaultEmployees()` on startup.
> The admin user is created/updated every time the backend starts.
> To reset admin password, just restart the backend: `pm2 restart achme-backend`

---

## 24. Project Port Map Summary

| Service | Port | Accessible From | Notes |
|---------|------|-----------------|-------|
| Nginx (frontend + API proxy) | **82** | LAN network | Public-facing, use this |
| Node.js Backend (Express) | 5000 | Localhost only | Never open to LAN directly |
| MySQL Database | 3306 | Localhost only | Never open to LAN directly |
| Socket.IO (WebSocket) | via 82 | LAN network | Proxied by Nginx |

---

## Quick Reference — All Files Changed/Created

| File | Purpose |
|------|---------|
| `/var/www/achme/backend/.env` | DB creds, JWT secret, CORS origins, SMTP |
| `/var/www/achme/frontend/.env.production` | Empty API URL for relative /api/ calls |
| `/var/www/achme/ecosystem.config.js` | PM2 process config (cluster, logs, env) |
| `/etc/nginx/sites-available/achme` | Nginx: serve React build + proxy API |
| `/etc/netplan/00-installer-config.yaml` | Static LAN IP for server |
| `C:\Windows\System32\drivers\etc\hosts` (employee PCs) | achme.com → server IP |

---

## Final Summary — Commands to Run Everything

```bash
# ── INITIAL DEPLOY (run once) ────────────────────────────────────
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx git
sudo npm install -g pm2
sudo mkdir -p /var/www/achme && sudo chown -R $USER:$USER /var/www/achme
cd /var/www && git clone https://github.com/Ananth-madura/ACHME_COMUNICATION.git achme
# → Configure .env (Step 5)
# → Configure Nginx (Step 9)
cd /var/www/achme/backend && npm install
cd /var/www/achme/frontend && npm install && npm run build
sudo mkdir -p /var/log/achme && sudo chown -R $USER:$USER /var/log/achme
pm2 start /var/www/achme/ecosystem.config.js --env production
pm2 save && pm2 startup
sudo ufw allow 82/tcp && sudo ufw enable
sudo nginx -t && sudo systemctl reload nginx

# ── DAILY OPERATIONS ─────────────────────────────────────────────
pm2 status                           # Check backend health
pm2 logs achme-backend               # View logs
curl http://localhost:82/api/health  # Quick health check

# ── AFTER CODE UPDATE ────────────────────────────────────────────
cd /var/www/achme && git pull origin main
pm2 restart achme-backend            # Restart backend
cd /var/www/achme/frontend && npm run build  # Rebuild frontend (if changed)
```

---

*Guide generated for: ACHME Communication CRM*
*Stack: React 19 · Node.js/Express 5 · MySQL 8 · Socket.IO 4 · Nginx · PM2*
*GitHub: https://github.com/Ananth-madura/ACHME_COMUNICATION*
