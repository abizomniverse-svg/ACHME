# ACHME Communication CRM — ULTIMATE Live Deployment Guide
## React 19 · Node.js/Express 5 · MySQL 8 · Nginx (Port 82) · PM2 · Socket.IO · LAN Access · achme.com Local Domain

> ⚡ **AI INSTRUCTION:** Read this file completely from top to bottom and execute every step in order.
> Every command, every file path, every exact content is spelled out.
> **Replace `192.168.1.100` with your actual server LAN IP everywhere you see it.**
> Do not skip any step. Do not guess. Follow exactly.

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [Pre-Flight Checklist](#2-pre-flight-checklist)
3. [STEP 1 — Assign Static LAN IP to Server](#3-step-1--assign-static-lan-ip-to-server)
4. [STEP 2 — Install All System Dependencies](#4-step-2--install-all-system-dependencies)
5. [STEP 3 — Clone the ACHME Repository](#5-step-3--clone-the-achme-repository)
6. [STEP 4 — MySQL Database Setup (achme)](#6-step-4--mysql-database-setup-achme)
7. [STEP 5 — Backend `.env` File (exact content)](#7-step-5--backend-env-file-exact-content)
8. [STEP 6 — Install Backend Dependencies + Chromium](#8-step-6--install-backend-dependencies--chromium)
9. [STEP 7 — Run Database Pre-check](#9-step-7--run-database-pre-check)
10. [STEP 8 — Build React Frontend](#10-step-8--build-react-frontend)
11. [STEP 9 — Create PM2 Ecosystem File](#11-step-9--create-pm2-ecosystem-file)
12. [STEP 10 — Start Backend with PM2](#12-step-10--start-backend-with-pm2)
13. [STEP 11 — Configure Nginx (Port 82 + WebSocket + Uploads)](#13-step-11--configure-nginx-port-82--websocket--uploads)
14. [STEP 12 — Configure Local Domain: achme.com → IP:82](#14-step-12--configure-local-domain-achmecom--ip82)
15. [STEP 13 — Firewall: Open Port 82](#15-step-13--firewall-open-port-82)
16. [STEP 14 — Verify Every Layer](#16-step-14--verify-every-layer)
17. [STEP 15 — Employee LAN Access Setup](#17-step-15--employee-lan-access-setup)
18. [STEP 16 — Auto-start on Server Reboot](#18-step-16--auto-start-on-server-reboot)
19. [All API Routes Reference](#19-all-api-routes-reference)
20. [PM2 Command Cheatsheet](#20-pm2-command-cheatsheet)
21. [Nginx Command Cheatsheet](#21-nginx-command-cheatsheet)
22. [MySQL Command Cheatsheet](#22-mysql-command-cheatsheet)
23. [Full CRUD Verification Checklist](#23-full-crud-verification-checklist)
24. [Troubleshooting Guide](#24-troubleshooting-guide)
25. [Default Login Credentials](#25-default-login-credentials)
26. [Port Map Summary](#26-port-map-summary)
27. [ONE-SHOT Quick Command Reference](#27-one-shot-quick-command-reference)

---

## 1. Architecture Overview

```
╔══════════════════════════════════════════════════════════════════╗
║          EMPLOYEE BROWSER  (any device on office WiFi)          ║
║   URL:  http://192.168.1.100:82   OR   http://achme.com         ║
║   Browsers: Chrome, Firefox, Edge, Safari, Mobile browsers      ║
╚══════════════════════════════════════════════════════════════════╝
                                │
                          Port 82 (TCP)
                                │
                                ▼
╔══════════════════════════════════════════════════════════════════╗
║                    NGINX  (Port 82)                             ║
║  /              → serve /var/www/achme/frontend/build/          ║
║  /api/*         → proxy_pass http://127.0.0.1:5000             ║
║  /uploads/*     → proxy_pass http://127.0.0.1:5000/uploads/    ║
║  /socket.io/*   → proxy_pass http://127.0.0.1:5000/socket.io/  ║
║  config: /etc/nginx/sites-available/achme                       ║
╚══════════════════════════════════════════════════════════════════╝
                                │
                       Port 5000 (localhost only)
                                │
                                ▼
╔══════════════════════════════════════════════════════════════════╗
║           NODE.JS / EXPRESS 5 BACKEND                           ║
║   Entry:   /var/www/achme/backend/server.js                     ║
║   Process: PM2 (cluster, 2 workers, auto-restart)              ║
║   Socket.IO: chatsockets.js + notifications.js                  ║
║   PDF:     Puppeteer (headless Chromium)                        ║
║   Email:   Nodemailer (Gmail SMTP)                              ║
║   Auth:    JWT + bcryptjs                                        ║
╚══════════════════════════════════════════════════════════════════╝
                                │
                       Port 3306 (localhost only)
                                │
                                ▼
╔══════════════════════════════════════════════════════════════════╗
║                MYSQL 8 DATABASE                                 ║
║   Database:  achme                                               ║
║   Charset:   utf8mb4 / utf8mb4_unicode_ci                       ║
║   Auto-init: ALL tables created on first backend start          ║
║   Tables:    users, teammember, Telecalls, Walkins, clients,    ║
║              quotations, invoices, tasks, leads, amc, targets,  ║
║              notifications, call_reports, contracts, payments... ║
╚══════════════════════════════════════════════════════════════════╝
```

**Data flow for every request:**
1. Employee types `http://192.168.1.100:82` → Nginx serves `frontend/build/index.html`
2. React app loads in browser
3. React calls `/api/auth/login` → Nginx proxies to `localhost:5000/api/auth/login`
4. Backend validates, returns JWT token
5. All subsequent calls include `Authorization: Bearer <token>` header
6. Real-time events flow over WebSocket: browser ↔ Nginx ↔ Socket.IO

---

## 2. Pre-Flight Checklist

Run these on the server terminal BEFORE starting deployment:

```bash
# ── CHECK 1: Ubuntu version (must be 20.04, 22.04, or 24.04) ────
lsb_release -a
# Expected: Ubuntu 20.04/22.04/24.04 LTS

# ── CHECK 2: Detect your server's current LAN IP ─────────────────
ip addr show | grep "inet " | grep -v "127.0.0.1"
# Example output: inet 192.168.1.100/24 brd ...
# Your LAN IP is: 192.168.1.100  ← NOTE THIS DOWN

# ── CHECK 3: Check which ports are free ──────────────────────────
sudo ss -tlnp | grep -E ':82|:5000|:3306|:80'
# Ports 82, 5000 must be EMPTY (no output)
# Port 3306 = MySQL will appear AFTER Step 2

# ── CHECK 4: Check available disk space ──────────────────────────
df -h /
# Need at least 5GB free (Puppeteer Chromium is ~300MB)

# ── CHECK 5: Check RAM ────────────────────────────────────────────
free -h
# Need at least 2GB RAM (4GB recommended for Puppeteer)

# ── CHECK 6: Check internet connectivity (for npm install) ───────
curl -s https://registry.npmjs.org/ | head -1
# Expected: {"db_name":"registry",...}
```

---

## 3. STEP 1 — Assign Static LAN IP to Server

> Your server MUST have a fixed LAN IP so all employees always reach the same address.
> Replace `enp0s3` below with your actual interface name from `ip link show`.

### Method A — Netplan (Ubuntu 20.04/22.04/24.04)

```bash
# Find your network interface name
ip link show
# Look for: eth0, enp0s3, ens33, wlan0 (one of these)

# Find your current router gateway IP
ip route | grep default
# Example output: default via 192.168.1.1 dev enp0s3 ...
# Gateway is: 192.168.1.1

# List existing netplan files
ls /etc/netplan/
# Usually: 00-installer-config.yaml  OR  01-netcfg.yaml

# Edit the netplan config (replace filename with what you see above)
sudo nano /etc/netplan/00-installer-config.yaml
```

**REPLACE the entire file contents with exactly this** (adjust interface + IPs):
```yaml
# FILE: /etc/netplan/00-installer-config.yaml
# ── ACHME CRM Static IP Configuration ──
network:
  version: 2
  renderer: networkd
  ethernets:
    enp0s3:                        # ← CHANGE to your interface name
      dhcp4: no
      addresses:
        - 192.168.1.100/24         # ← Your chosen static LAN IP
      routes:
        - to: default
          via: 192.168.1.1         # ← Your router gateway IP
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

```bash
# Apply the configuration
sudo netplan apply

# Confirm the IP was set
ip addr show enp0s3 | grep "inet "
# Expected: inet 192.168.1.100/24 ...

# Confirm internet still works
ping -c 3 8.8.8.8
```

### Method B — Reserve IP in Router (Easier, no server config needed)

1. Open your browser on any device → go to `http://192.168.1.1` (router admin)
2. Login (default: admin/admin or admin/password)
3. Find: **DHCP** → **Address Reservation** or **Static IP Lease**
4. Add entry: MAC address of server → IP: `192.168.1.100`
5. Save + Reboot router
6. Reboot server: `sudo reboot`

---

## 4. STEP 2 — Install All System Dependencies

Run each block in order. Do not skip any command.

```bash
# ── 2a: Update system package list ───────────────────────────────
sudo apt update && sudo apt upgrade -y
```

```bash
# ── 2b: Install Node.js 20 LTS (official NodeSource method) ──────
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version    # Must show: v20.x.x
npm --version     # Must show: 10.x.x
```

```bash
# ── 2c: Install MySQL 8 ───────────────────────────────────────────
sudo apt install -y mysql-server

# Start MySQL and set it to auto-start on boot
sudo systemctl start mysql
sudo systemctl enable mysql

# Verify MySQL is running
sudo systemctl status mysql | grep "Active:"
# Expected: Active: active (running)
```

```bash
# ── 2d: Secure MySQL installation ────────────────────────────────
sudo mysql_secure_installation
# Answer the prompts:
#   VALIDATE PASSWORD plugin? → N (press Enter for No)
#   Set root password? → Y  → enter: admin@123  (or any strong password)
#   Remove anonymous users? → Y
#   Disallow root login remotely? → Y
#   Remove test database? → Y
#   Reload privilege tables? → Y
```

```bash
# ── 2e: Install PM2 globally ──────────────────────────────────────
sudo npm install -g pm2

# Verify
pm2 --version     # Must show: 5.x.x or higher
```

```bash
# ── 2f: Install Nginx ─────────────────────────────────────────────
sudo apt install -y nginx

# Start Nginx and set it to auto-start
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify
sudo systemctl status nginx | grep "Active:"
# Expected: Active: active (running)

nginx -v
# Expected: nginx/1.18.x or higher
```

```bash
# ── 2g: Install Git ───────────────────────────────────────────────
sudo apt install -y git

# Verify
git --version
# Expected: git version 2.x.x

# ── 2h: Install Chromium deps for Puppeteer PDF generation ───────
# These are REQUIRED — without them, PDF download will fail
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
  libasound2 \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libc6 \
  libcairo2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgcc1 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxext6 \
  libxi6 \
  libxtst6

echo "✅ All dependencies installed"
```

---

## 5. STEP 3 — Clone the ACHME Repository

```bash
# ── Create the deployment directory ───────────────────────────────
sudo mkdir -p /var/www/achme
sudo chown -R $USER:$USER /var/www/achme

# ── Clone from GitHub ─────────────────────────────────────────────
cd /var/www
git clone https://github.com/Ananth-madura/ACHME_COMUNICATION.git achme

# ── Verify the folder structure is correct ────────────────────────
ls /var/www/achme
# Must show: backend/  frontend/  server-deployment/  README.md

ls /var/www/achme/backend
# Must show: server.js  routes/  config/  sockets/  package.json  .env.example  db_init.js

ls /var/www/achme/frontend
# Must show: src/  public/  package.json

ls /var/www/achme/backend/routes/
# Must show: authRoutes.js  newclient.js  taskRoutes.js  telecallRoutes.js  ...

ls /var/www/achme/backend/sockets/
# Must show: chatsockets.js  notifications.js
```

---

## 6. STEP 4 — MySQL Database Setup (achme)

```bash
# ── Login to MySQL as root ────────────────────────────────────────
sudo mysql -u root -p
# Enter the root password you set in Step 2d (admin@123)
```

Inside the MySQL shell, run these SQL commands exactly:

```sql
-- ── Create the ACHME database ────────────────────────────────────
CREATE DATABASE IF NOT EXISTS achme
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- ── Create dedicated application user (more secure than root) ────
CREATE USER IF NOT EXISTS 'achme_user'@'localhost'
  IDENTIFIED BY 'AchmeSecure@2024';

-- ── Grant all permissions on the achme database ──────────────────
GRANT ALL PRIVILEGES ON achme.* TO 'achme_user'@'localhost';

-- ── Apply changes ─────────────────────────────────────────────────
FLUSH PRIVILEGES;

-- ── Verify database was created ───────────────────────────────────
SHOW DATABASES;
-- Must show: achme in the list

-- ── Verify user was created ───────────────────────────────────────
SELECT user, host FROM mysql.user WHERE user = 'achme_user';
-- Must show one row: achme_user | localhost

-- ── Exit MySQL shell ──────────────────────────────────────────────
EXIT;
```

> **Note:** The backend's `config/database.js` automatically creates ALL 30+ tables
> (users, clients, telecalls, walkins, quotations, invoices, tasks, leads, amc, etc.)
> on first startup. You do NOT need to run any SQL schema file manually.

---

## 7. STEP 5 — Backend `.env` File (exact content)

```bash
# ── Navigate to backend directory ────────────────────────────────
cd /var/www/achme/backend

# ── Create the .env file ─────────────────────────────────────────
nano .env
```

**Paste this EXACT content into the file.** Change `192.168.1.100` to your actual server LAN IP:

```env
# ============================================================
# FILE: /var/www/achme/backend/.env
# ACHME Communication CRM — Production Configuration
# ============================================================

# ── Server ───────────────────────────────────────────────────────
PORT=5000
NODE_ENV=production

# ⚠️ IMPORTANT: Add your actual server LAN IP here
# This controls which origins the backend CORS policy allows
# Format: comma-separated, no spaces between items
ALLOWED_ORIGIN=http://192.168.1.100:82,http://achme.com,http://www.achme.com

DEFAULT_TEST_PASSWORD=Test@12345

# ── MySQL Database ───────────────────────────────────────────────
# Connect via 127.0.0.1 (loopback) — NEVER use 'localhost' in production
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=achme_user
DB_PASS=AchmeSecure@2024
DB_NAME=achme

# ── Email (Gmail SMTP with App Password) ─────────────────────────
# To generate Gmail App Password:
# Google Account → Security → 2FA → App Passwords → Mail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=thanan757@gmail.com
EMAIL_PASS=ghjv omqm hwji kerq

# ── JWT Authentication Secret ────────────────────────────────────
# Generate new: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=97418d0c15d57ade768586b8501e35d34e5a5277f2a0570b6d5b47ef93f5b33e88b80045c60efd77e6edcbb015dbe46cf6747ce1dd8f11361f3e426ddc677c9a
```

Save the file: `Ctrl+O` → `Enter` → `Ctrl+X`

```bash
# ── Verify the file was saved correctly ───────────────────────────
cat /var/www/achme/backend/.env
# Must show all 14 variables with values

# ── Critical check: make sure no variable is empty ───────────────
grep -E "DB_HOST=|DB_USER=|DB_PASS=|DB_NAME=|JWT_SECRET=" /var/www/achme/backend/.env
# All 5 must have values after the = sign
```

---

## 8. STEP 6 — Install Backend Dependencies + Chromium

```bash
# ── Install Node.js dependencies ──────────────────────────────────
cd /var/www/achme/backend
npm install

# This installs (from package.json):
# express, cors, mysql2, jsonwebtoken, bcryptjs, multer,
# socket.io, nodemailer, node-schedule, puppeteer, twilio, dotenv, axios
# Expected: added ~1000 packages
# Expected final line: "added XXX packages in XXs"

# ── Verify key packages are installed ────────────────────────────
ls node_modules | grep -E "express|mysql2|socket.io|puppeteer|bcryptjs"
# Must show all of: bcryptjs, express, mysql2, puppeteer, socket.io

# ── Verify server.js entry point exists ──────────────────────────
ls -la /var/www/achme/backend/server.js
# Must show the file with a size > 0
```

---

## 9. STEP 7 — Run Database Pre-check

```bash
# ── Run the database initializer to verify MySQL connection ───────
cd /var/www/achme/backend
node db_init.js

# Expected output (must see ALL of these lines):
# ======================================================
# ⚙️  DATABASE PRE-START CHECK
# Connecting to MySQL at 127.0.0.1:3306 as achme_user...
# ======================================================
# ✅ Connected to MySQL server successfully.
# ✅ Database 'achme' exists or was successfully created.
# ======================================================

# If you see ❌ Failed to connect — go to Troubleshooting section
```

---

## 10. STEP 8 — Build React Frontend

> In production, the frontend calls `/api/...` as a relative path.
> Nginx receives it on port 82 and proxies it to the backend.
> This means no IP is hardcoded — it works from any device on any IP.

```bash
# ── Create frontend production environment file ───────────────────
# The empty REACT_APP_API_URL makes config/index.js return "" for production
# So all API calls become relative: fetch("/api/auth/login") etc.
cat > /var/www/achme/frontend/.env.production << 'EOF'
# FILE: /var/www/achme/frontend/.env.production
# Leave REACT_APP_API_URL empty for production
# The app's config/index.js returns "" in production mode
# All API calls become /api/... which Nginx proxies to port 5000
REACT_APP_API_URL=
EOF

# Verify the file
cat /var/www/achme/frontend/.env.production
# Expected: REACT_APP_API_URL=   (empty value, that's correct)
```

```bash
# ── Install frontend dependencies ────────────────────────────────
cd /var/www/achme/frontend
npm install

# Installs: react, react-dom, react-router-dom, axios, socket.io-client,
# framer-motion, recharts, lucide-react, tailwindcss, html2pdf.js, etc.
# Expected: added ~2000+ packages

# ── Build production bundle ───────────────────────────────────────
npm run build

# This runs: react-scripts build
# Creates: /var/www/achme/frontend/build/
# Time: 2–5 minutes (Puppeteer-related packages may slow it)
# Expected final line: "Compiled successfully."

# ── Verify build succeeded ────────────────────────────────────────
ls /var/www/achme/frontend/build/
# Must show: index.html  static/  favicon.ico  manifest.json  asset-manifest.json

ls /var/www/achme/frontend/build/static/js/
# Must show: main.xxxxxxxx.js  (the compiled React bundle, usually 1–3MB)

ls /var/www/achme/frontend/build/static/css/
# Must show: main.xxxxxxxx.css

# ── Check build size ──────────────────────────────────────────────
du -sh /var/www/achme/frontend/build/
# Expected: 5–15 MB
```

---

## 11. STEP 9 — Create PM2 Ecosystem File

```bash
# ── Create the PM2 config file ────────────────────────────────────
nano /var/www/achme/ecosystem.config.js
```

**Paste this EXACT content:**

```javascript
// FILE: /var/www/achme/ecosystem.config.js
// PM2 process manager configuration for ACHME CRM Backend
// Run with: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      // ── Identity ─────────────────────────────────────────────────
      name: 'achme-backend',
      script: '/var/www/achme/backend/server.js',

      // ── Cluster mode: 2 workers for stability on 2-core server ───
      // Change 'instances: 2' to 'max' if you have 4+ cores
      instances: 2,
      exec_mode: 'cluster',

      // ── Reliability ───────────────────────────────────────────────
      autorestart: true,
      watch: false,               // NEVER watch files in production
      max_memory_restart: '800M', // Restart worker if it uses > 800MB

      // ── Environment: production ───────────────────────────────────
      // These values are read AFTER .env file, so .env takes priority
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // ── Log files ─────────────────────────────────────────────────
      error_file: '/var/log/achme/backend-error.log',
      out_file:   '/var/log/achme/backend-out.log',
      merge_logs: true,    // Merge cluster logs into one file
      time: true,          // Prepend timestamps to all log lines

      // ── Graceful shutdown settings ───────────────────────────────
      kill_timeout: 5000,      // Wait 5s before force-killing
      wait_ready: true,        // Wait for app to signal ready
      listen_timeout: 15000,   // Wait 15s for port to open
    }
  ]
};
```

Save: `Ctrl+O` → `Enter` → `Ctrl+X`

```bash
# ── Create log directory ──────────────────────────────────────────
sudo mkdir -p /var/log/achme
sudo chown -R $USER:$USER /var/log/achme

# Verify
ls -la /var/log/achme/
# Expected: empty directory owned by your user
```

---

## 12. STEP 10 — Start Backend with PM2

```bash
# ── Start the backend ─────────────────────────────────────────────
pm2 start /var/www/achme/ecosystem.config.js --env production

# ── Check status ──────────────────────────────────────────────────
pm2 status
# Expected output:
# ┌─────┬────────────────┬─────────┬──────┬────────┬─────┬────────┐
# │ id  │ name           │ mode    │ ↺    │ status │ cpu │ memory │
# ├─────┼────────────────┼─────────┼──────┼────────┼─────┼────────┤
# │ 0   │ achme-backend  │ cluster │ 0    │ online │ 0%  │ ~50MB  │
# │ 1   │ achme-backend  │ cluster │ 0    │ online │ 0%  │ ~50MB  │
# └─────┴────────────────┴─────────┴──────┴────────┴─────┴────────┘

# ── View startup logs (must see table creation messages) ──────────
pm2 logs achme-backend --lines 60 --nostream
# Expected key lines (in any order):
# ✅ Connected to MySQL
# ✅ users table ready
# ✅ clients table ready
# ✅ Telecalls table ready
# ✅ Default employees seeded
# ✅ Server running: http://0.0.0.0:5000 [production]

# ── Test backend health endpoint directly ────────────────────────
curl http://localhost:5000/api/health
# Expected: {"ok":true,"database":"ready","uptime":...,"timestamp":"..."}
```

> **If PM2 shows `errored` status:**
> Run `pm2 logs achme-backend --lines 30` to see the error.
> Most common causes: missing `.env` file, wrong DB password, port conflict.
> See Troubleshooting section.

---

## 13. STEP 11 — Configure Nginx (Port 82 + WebSocket + Uploads)

```bash
# ── Remove default Nginx site to avoid conflicts ──────────────────
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-available/default

# ── Create ACHME Nginx config ─────────────────────────────────────
sudo nano /etc/nginx/sites-available/achme
```

**Paste this ENTIRE content exactly.** Change `192.168.1.100` to your server LAN IP:

```nginx
# FILE: /etc/nginx/sites-available/achme
# ACHME Communication CRM — Nginx Configuration
# ─────────────────────────────────────────────────────────────────
# Port 82: serves React build + proxies /api/ → Node.js (port 5000)
# Supports: http://192.168.1.100:82  AND  http://achme.com
# WebSocket: /socket.io/ for real-time chat and notifications

server {
    # ── Listen on port 82 for all network interfaces ──────────────
    listen 82;
    listen [::]:82;

    # ── Accept requests by LAN IP, local domain, and localhost ───
    # Replace 192.168.1.100 with your actual server LAN IP
    server_name 192.168.1.100 achme.com www.achme.com localhost 127.0.0.1;

    # ── React production build directory ─────────────────────────
    root /var/www/achme/frontend/build;
    index index.html;

    # ── Log files ────────────────────────────────────────────────
    access_log /var/log/nginx/achme-access.log;
    error_log  /var/log/nginx/achme-error.log warn;

    # ── Upload size limit (PDFs, images) ─────────────────────────
    client_max_body_size 50M;

    # ── Gzip compression (faster page loads) ─────────────────────
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1000;

    # ── React SPA — serve index.html for ALL frontend routes ─────
    # This is REQUIRED for React Router (BrowserRouter) to work
    # Without this, employees refreshing /dashboard get a 404
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ── Static assets: JS, CSS, images — cache 7 days ────────────
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$ {
        root /var/www/achme/frontend/build;
        expires 7d;
        add_header Cache-Control "public, no-transform";
        try_files $uri =404;
    }

    # ── Proxy ALL /api/ requests to Node.js backend ──────────────
    # Every CRUD operation, login, data fetch goes through here
    location /api/ {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;

        # WebSocket upgrade headers (required for Socket.IO polling fallback)
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";

        # Forward real client IP
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # Timeouts: 120s for PDF generation (Puppeteer can be slow)
        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    120s;

        # Do not cache API responses
        proxy_cache_bypass $http_upgrade;
        add_header Cache-Control "no-store, no-cache";
    }

    # ── Proxy /uploads/ — backend serves uploaded files ──────────
    # This handles images, PDFs, attachments uploaded by employees
    location /uploads/ {
        proxy_pass         http://127.0.0.1:5000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header   Host      $host;
        proxy_set_header   X-Real-IP $remote_addr;
        expires 1d;
        add_header Cache-Control "public";
    }

    # ── Socket.IO WebSocket endpoint ─────────────────────────────
    # Handles: real-time chat, live notifications, data_changed events
    # frontend/src/socket/socket.js connects here
    location /socket.io/ {
        proxy_pass         http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;

        # CRITICAL: These two headers enable WebSocket upgrade
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";

        proxy_set_header   Host      $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;

        # Long timeout for persistent WebSocket connections
        proxy_read_timeout  3600s;
        proxy_send_timeout  3600s;

        # No caching for WebSocket
        proxy_cache_bypass $http_upgrade;
    }

    # ── Block access to hidden/sensitive files ───────────────────
    location ~ /\. {
        deny all;
        return 404;
    }
}
```

Save: `Ctrl+O` → `Enter` → `Ctrl+X`

```bash
# ── Enable the site ───────────────────────────────────────────────
sudo ln -sf /etc/nginx/sites-available/achme /etc/nginx/sites-enabled/achme

# ── Test Nginx config for syntax errors ──────────────────────────
sudo nginx -t
# Expected:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# ── Reload Nginx (zero downtime reload) ───────────────────────────
sudo systemctl reload nginx

# ── Confirm port 82 is now listening ─────────────────────────────
sudo ss -tlnp | grep ':82'
# Expected: LISTEN 0 511 0.0.0.0:82 ... users:(("nginx",...))

# ── Confirm Nginx is serving the React app ────────────────────────
curl -I http://localhost:82/
# Expected: HTTP/1.1 200 OK  Content-Type: text/html

# ── Confirm API proxy works through Nginx ────────────────────────
curl http://localhost:82/api/health
# Expected: {"ok":true,"database":"ready","uptime":...}
```

---

## 14. STEP 12 — Configure Local Domain: achme.com → IP:82

> This lets employees type `http://achme.com` instead of `http://192.168.1.100:82`.
> Choose ONE of the three options below.

### Option A — Configure Each Employee's Hosts File (Simplest, no router access needed)

Tell each employee to do this on their device:

**Windows (each employee PC):**
```
1. Press Start → search "Notepad"
2. Right-click Notepad → "Run as Administrator"
3. File → Open → navigate to: C:\Windows\System32\drivers\etc\hosts
   (change file filter to "All Files (*.*)" to see it)
4. Add this line at the very bottom:
   192.168.1.100    achme.com    www.achme.com
5. File → Save
6. Open browser → http://achme.com → ACHME CRM should load
```

**Mac (each employee Mac):**
```bash
sudo nano /etc/hosts
# Add this line at the bottom:
# 192.168.1.100    achme.com    www.achme.com
# Save: Ctrl+O → Enter → Ctrl+X
# Flush DNS cache:
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
# Open browser → http://achme.com
```

**Linux (each employee Linux):**
```bash
sudo nano /etc/hosts
# Add this line:
# 192.168.1.100    achme.com    www.achme.com
# Save: Ctrl+O → Enter → Ctrl+X
```

**Android/iOS mobile browsers:**
- Requires a DNS app (like DNS Changer) or use the IP directly: `http://192.168.1.100:82`
- Mobile browsers cannot edit hosts files without root

---

### Option B — Router DNS Config (Best: all devices auto-resolved, zero per-device setup)

1. Login to router admin: `http://192.168.1.1`
2. Find: **Advanced** → **LAN DNS** (or "Static DNS" or "Custom Hostnames")
3. Add entry:
   - Hostname: `achme.com`
   - IP Address: `192.168.1.100`
4. Add second entry:
   - Hostname: `www.achme.com`
   - IP Address: `192.168.1.100`
5. Save and reboot router
6. On any device on the office WiFi: open browser → `http://achme.com` → works instantly

---

### Option C — dnsmasq on Server (Advanced: server acts as DNS for the LAN)

```bash
# Install dnsmasq DNS server
sudo apt install -y dnsmasq

# Back up original config
sudo cp /etc/dnsmasq.conf /etc/dnsmasq.conf.backup

# Add ACHME domain resolution
sudo nano /etc/dnsmasq.conf
# Add these lines at the bottom:
# address=/achme.com/192.168.1.100
# address=/www.achme.com/192.168.1.100

# Restart dnsmasq
sudo systemctl restart dnsmasq
sudo systemctl enable dnsmasq

# On router: set Primary DNS server to 192.168.1.100
# All devices on LAN will now resolve achme.com → 192.168.1.100
```

---

### Verify domain resolution from the server itself

```bash
# Add to server's own hosts file so the server can resolve achme.com too
echo "192.168.1.100    achme.com    www.achme.com" | sudo tee -a /etc/hosts

# Test resolution
ping -c 2 achme.com
# Expected: PING achme.com (192.168.1.100)

# Test HTTP access via domain name
curl -I http://achme.com:82/
# Expected: HTTP/1.1 200 OK
```

---

## 15. STEP 13 — Firewall: Open Port 82

```bash
# ── Enable UFW firewall ───────────────────────────────────────────
sudo ufw enable
# If asked "Command may disrupt existing ssh connections" → type y

# ── Allow SSH (IMPORTANT: do this first to avoid locking yourself out)
sudo ufw allow 22/tcp

# ── Allow port 82 (Nginx — what employees access) ────────────────
sudo ufw allow 82/tcp

# ── Allow port 80 (optional, redirect to 82 later) ───────────────
sudo ufw allow 80/tcp

# ── DO NOT open ports 5000 or 3306 ───────────────────────────────
# Port 5000 (Node.js backend): internal only, Nginx proxies to it
# Port 3306 (MySQL): internal only, backend connects to it

# ── Check firewall rules ──────────────────────────────────────────
sudo ufw status verbose
# Expected output:
# Status: active
# To                    Action      From
# --                    ------      ----
# 22/tcp                ALLOW IN    Anywhere
# 82/tcp                ALLOW IN    Anywhere
# 80/tcp                ALLOW IN    Anywhere
```

---

## 16. STEP 14 — Verify Every Layer

Run these in order. Every single check must pass before proceeding.

```bash
# ══════════════════════════════════════════════════════════════════
# CHECK 1: MySQL is running
# ══════════════════════════════════════════════════════════════════
sudo systemctl status mysql | grep "Active:"
# ✅ PASS: Active: active (running)

sudo mysql -u achme_user -pAchmeSecure@2024 achme -e "SHOW TABLES;" 2>/dev/null
# ✅ PASS: Shows 30+ table names (users, clients, Telecalls, etc.)
# ⚠️  If empty: backend hasn't started yet — run Step 10 first

# ══════════════════════════════════════════════════════════════════
# CHECK 2: Backend is running and healthy
# ══════════════════════════════════════════════════════════════════
pm2 status
# ✅ PASS: achme-backend | cluster | online (2 rows)

curl -s http://localhost:5000/api/health | python3 -m json.tool
# ✅ PASS: {"ok": true, "database": "ready", "uptime": ...}

# ══════════════════════════════════════════════════════════════════
# CHECK 3: Nginx is running on port 82
# ══════════════════════════════════════════════════════════════════
sudo systemctl status nginx | grep "Active:"
# ✅ PASS: Active: active (running)

sudo ss -tlnp | grep ':82'
# ✅ PASS: LISTEN ... 0.0.0.0:82 ... ("nginx")

# ══════════════════════════════════════════════════════════════════
# CHECK 4: React frontend is served
# ══════════════════════════════════════════════════════════════════
curl -I http://localhost:82/
# ✅ PASS: HTTP/1.1 200 OK  Content-Type: text/html

curl -s http://localhost:82/ | grep -o '<title>[^<]*</title>'
# ✅ PASS: <title>ACHME Communication</title> (or similar)

# ══════════════════════════════════════════════════════════════════
# CHECK 5: API proxy works through Nginx
# ══════════════════════════════════════════════════════════════════
curl -s http://localhost:82/api/health
# ✅ PASS: {"ok":true,"database":"ready",...}

# ══════════════════════════════════════════════════════════════════
# CHECK 6: Login API works (full stack test)
# ══════════════════════════════════════════════════════════════════
curl -s -X POST http://localhost:82/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Kk@achmecommunication.com","password":"kk@admin@123"}' \
  | python3 -m json.tool
# ✅ PASS: {"token":"eyJ...","user":{"id":1,"email":"Kk@achmecommunication.com","role":"admin",...}}

# ══════════════════════════════════════════════════════════════════
# CHECK 7: Socket.IO WebSocket endpoint
# ══════════════════════════════════════════════════════════════════
curl -s "http://localhost:5000/socket.io/?EIO=4&transport=polling"
# ✅ PASS: 0{"sid":"...","upgrades":["websocket"],...}

curl -s "http://localhost:82/socket.io/?EIO=4&transport=polling"
# ✅ PASS: Same — confirms Nginx is proxying Socket.IO correctly

# ══════════════════════════════════════════════════════════════════
# CHECK 8: Accessible from LAN (replace 192.168.1.100 with your IP)
# ══════════════════════════════════════════════════════════════════
curl -s http://192.168.1.100:82/api/health
# ✅ PASS: {"ok":true,"database":"ready",...}

# ══════════════════════════════════════════════════════════════════
# CHECK 9: achme.com domain (after Step 12 hosts file setup)
# ══════════════════════════════════════════════════════════════════
curl -s http://achme.com:82/api/health
# ✅ PASS: {"ok":true,"database":"ready",...}

echo ""
echo "═══════════════════════════════════════════"
echo "  All checks passed — ACHME CRM is LIVE!"
echo "  URL: http://192.168.1.100:82"
echo "  URL: http://achme.com"
echo "═══════════════════════════════════════════"
```

---

## 17. STEP 15 — Employee LAN Access Setup

### What employees need to do:

1. **Connect to the same office WiFi** as the server machine
2. Open any of these browsers: Chrome, Firefox, Edge, Safari, Samsung Internet, Opera
3. In address bar, type one of:
   - `http://192.168.1.100:82` ← always works (no extra setup)
   - `http://achme.com` ← works after hosts file / router DNS setup

### Employee login credentials:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | `Kk@achmecommunication.com` | `kk@admin@123` | Full admin dashboard, all modules |
| Employee – Princee | `info@achmecommunication.com` | `Achme@Princee` | Employee dashboard |
| Employee – Vimal | `sales1@technostore.co.in` | `Achme@Vimal` | Employee dashboard |
| Employee – Moorthi | `sales5@technostore.co.in` | `Achme@Moorthi` | Employee dashboard |
| Employee – Uma | `uma@achmecommunication.com` | `Achme@Uma` | Employee dashboard |
| Employee – Nagaraj | `nagaraj@technostore.co.in` | `Achme@Nagaraj` | Employee dashboard |
| Employee – Priyanka | `service@achmecommunication.com` | `Achme@Priyanka` | Employee dashboard |

> These are auto-seeded by `backend/config/database.js` → `seedDefaultEmployees()` on every backend startup.
> Employee password format: `Achme@{FirstName}`
> Admin password reset: just `pm2 restart achme-backend` (re-seeds the default password)

### What employees can do:

All employees can access these modules from their browser (same WiFi):
- **Dashboard** — charts, targets, task overview
- **Telecalling** — log calls, outcomes, follow-ups
- **Walk-ins** — register walk-in visits
- **Clients** — add/edit/search clients (CRM)
- **Quotations** — generate quotations with GST, PDF download
- **Invoices** — create tax invoices, proforma invoices, estimate invoices
- **AMC** — Annual Maintenance Contracts
- **Call Reports** — service call logs
- **Leads** — lead management pipeline
- **Tasks** — assign and track tasks
- **Targets** — monthly/yearly sales targets
- **Reports** — detailed sales and activity reports
- **Chat** — real-time team chat (Socket.IO)
- **Notifications** — live notifications (Socket.IO)
- **Settings / Profile** — user settings

---

## 18. STEP 16 — Auto-start on Server Reboot

After this step, when the server restarts (power cut, reboot), all services come back up automatically without manual intervention.

```bash
# ── Step A: Save current PM2 process list ────────────────────────
pm2 save
# Expected: [PM2] Saving current process list...
# Expected: [PM2] Successfully saved in /home/user/.pm2/dump.pm2

# ── Step B: Generate the PM2 systemd startup script ──────────────
pm2 startup
# This command PRINTS a command to run — do NOT run pm2 startup itself
# It will show something like:
# [PM2] To setup the Startup Script, copy/paste the following command:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu

# ── Step C: COPY and RUN the command PM2 printed ─────────────────
# (The exact command depends on your username and Node.js path)
# Example (yours will be slightly different):
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# ── Step D: Save PM2 list again after startup config ─────────────
pm2 save

# ── Step E: Verify all services are set to auto-start ────────────
sudo systemctl is-enabled nginx
# Expected: enabled

sudo systemctl is-enabled mysql
# Expected: enabled

pm2 list
# Expected: achme-backend | online

# ── Step F: Test a full reboot (optional but recommended) ────────
sudo reboot
# Wait 45 seconds, SSH back into the server, then:
pm2 status                    # Must show: achme-backend | online
sudo systemctl status nginx   # Must show: active (running)
sudo systemctl status mysql   # Must show: active (running)
curl http://localhost:82/api/health
# Must return: {"ok":true,"database":"ready",...}
```

---

## 19. All API Routes Reference

The backend exposes these API endpoints (all proxied by Nginx from port 82):

| Route Prefix | File | Operations |
|---|---|---|
| `/api/auth` | `routes/authRoutes.js` | Login, register, approve users, change password |
| `/api/client` | `routes/newclient.js` | CRUD for clients/customers |
| `/api/Telecalls` | `routes/telecallRoutes.js` | CRUD for telecall logs, follow-ups |
| `/api/Walkins` | `routes/walkinRoutes.js` | CRUD for walk-in visits |
| `/api/quotations` | `routes/quotationRoutes.js` | CRUD for quotations, PDF export |
| `/api/invoice` | `routes/invoice.js` | CRUD for tax invoices |
| `/api/performainvoice` | `routes/performaInvoiceRoutes.js` | CRUD for proforma invoices |
| `/api/estimate-invoice` | `routes/estimateInvoiceRoutes.js` | Estimate to invoice conversion |
| `/api/estimate` | `routes/estimate.js` | CRUD for estimates |
| `/api/service-estimation` | `routes/serviceEstimationRoutes.js` | Service estimation module |
| `/api/contract` | `routes/contract.js` | CRUD for service contracts |
| `/api/amc` | `routes/amcRoutes.js` | Annual maintenance contracts |
| `/api/payments` | `routes/payment.js` | Payment records |
| `/api/call-reports` | `routes/callReportRoutes.js` | Field service call reports |
| `/api/Fields` | `routes/fieldRoutes.js` | Field operations |
| `/api/leads` | `routes/leadManagementRoutes.js` | Lead pipeline management |
| `/api/task` | `routes/taskRoutes.js` | Task assignment and tracking |
| `/api/targets` | `routes/targetRoutes.js` | Sales target management |
| `/api/reports` | `routes/reportRoutes.js` | Dashboard reports and analytics |
| `/api/teammember` | `routes/team.js` | Team member management |
| `/api/services` | `routes/serviceRoutes.js` | Services catalogue |
| `/api/notifications` | `routes/notificationRoutes.js` | Push notifications |
| `/api/health` | `server.js` | Health check (no auth required) |
| `/uploads/*` | Static | Uploaded files (images, PDFs) |

---

## 20. PM2 Command Cheatsheet

```bash
# ── Status & Monitoring ────────────────────────────────────────────
pm2 status                            # Overview of all processes
pm2 monit                             # Real-time CPU/RAM dashboard (interactive)
pm2 show achme-backend                # Detailed info for one process
pm2 info achme-backend                # Alias for show

# ── Log Viewing ───────────────────────────────────────────────────
pm2 logs achme-backend                # Live streaming logs (Ctrl+C to exit)
pm2 logs achme-backend --lines 100    # Last 100 log lines
pm2 logs --err                        # Show only error logs
pm2 flush achme-backend               # Clear log files
tail -f /var/log/achme/backend-out.log   # View out log directly
tail -f /var/log/achme/backend-error.log # View error log directly

# ── Process Control ───────────────────────────────────────────────
pm2 restart achme-backend             # Restart (brief downtime)
pm2 reload achme-backend              # Graceful reload (zero downtime, cluster)
pm2 stop achme-backend                # Stop process
pm2 start achme-backend               # Start stopped process
pm2 delete achme-backend              # Remove from PM2 list

# ── Ecosystem file ────────────────────────────────────────────────
pm2 start /var/www/achme/ecosystem.config.js --env production  # Start fresh
pm2 restart ecosystem.config.js       # Restart from ecosystem file

# ── Startup & Persistence ─────────────────────────────────────────
pm2 save                              # Save process list (survives reboot)
pm2 startup                           # Generate startup command (then run it)
pm2 unstartup                         # Remove startup config

# ── After code updates ────────────────────────────────────────────
cd /var/www/achme
git pull origin main                  # Pull latest code
pm2 reload achme-backend              # Graceful restart for backend changes
# If frontend changed:
cd /var/www/achme/frontend && npm run build    # Rebuild (Nginx serves it immediately)
```

---

## 21. Nginx Command Cheatsheet

```bash
# ── Config Testing ────────────────────────────────────────────────
sudo nginx -t                         # Test config for syntax errors
sudo nginx -T                         # Show full compiled config

# ── Service Control ───────────────────────────────────────────────
sudo systemctl reload nginx           # Reload config (zero downtime, use this)
sudo systemctl restart nginx          # Full restart
sudo systemctl stop nginx             # Stop Nginx
sudo systemctl start nginx            # Start Nginx
sudo systemctl status nginx           # Status

# ── Logs ─────────────────────────────────────────────────────────
sudo tail -f /var/log/nginx/achme-access.log   # Live access log (watch requests)
sudo tail -f /var/log/nginx/achme-error.log    # ACHME error log
sudo tail -f /var/log/nginx/error.log          # Nginx system errors

# ── Config files ─────────────────────────────────────────────────
sudo nano /etc/nginx/sites-available/achme     # Edit config
sudo ln -sf /etc/nginx/sites-available/achme /etc/nginx/sites-enabled/achme  # Enable
sudo rm /etc/nginx/sites-enabled/achme         # Disable

# ── After editing config ──────────────────────────────────────────
sudo nginx -t && sudo systemctl reload nginx   # Test + reload in one command

# ── Debugging ────────────────────────────────────────────────────
sudo ss -tlnp | grep nginx            # What ports Nginx listens on
curl -I http://localhost:82/          # Quick frontend test
curl http://localhost:82/api/health   # Quick API proxy test
```

---

## 22. MySQL Command Cheatsheet

```bash
# ── Connect ───────────────────────────────────────────────────────
sudo mysql -u root -p                          # As root
mysql -u achme_user -p achme                   # As app user

# ── Database operations (inside MySQL shell) ──────────────────────
SHOW DATABASES;                                # List databases
USE achme;                                     # Switch to achme
SHOW TABLES;                                   # List all tables
DESCRIBE users;                                # Show users table structure
SELECT COUNT(*) FROM clients;                  # Count clients
SELECT id, email, role FROM users LIMIT 10;    # View users
SELECT * FROM users WHERE email='Kk@achmecommunication.com';

# ── Backup ────────────────────────────────────────────────────────
mysqldump -u achme_user -p achme > /var/backups/achme_$(date +%F_%H%M).sql
# Creates: /var/backups/achme_2024-01-15_1430.sql

# Set up automated daily backup at 2 AM:
echo "0 2 * * * achme_user mysqldump -u achme_user -pAchmeSecure@2024 achme > /var/backups/achme_\$(date +\%F).sql" | sudo crontab -

# ── Restore ───────────────────────────────────────────────────────
mysql -u achme_user -p achme < /var/backups/achme_2024-01-15.sql

# ── Fix permissions ───────────────────────────────────────────────
sudo mysql -u root -p -e "GRANT ALL PRIVILEGES ON achme.* TO 'achme_user'@'localhost'; FLUSH PRIVILEGES;"

# ── Check MySQL is listening ──────────────────────────────────────
sudo ss -tlnp | grep ':3306'
```

---

## 23. Full CRUD Verification Checklist

Open `http://192.168.1.100:82` in browser. Test every module:

### Auth & Users
- [ ] **Login** as admin: `Kk@achmecommunication.com` / `kk@admin@123` → Admin dashboard loads
- [ ] **Login** as employee: `info@achmecommunication.com` / `Achme@Princee` → User dashboard loads
- [ ] **Logout** → redirects to login page
- [ ] **Register** new user → admin sees approval notification

### Clients (`/api/client`)
- [ ] **CREATE**: Add new client (name, phone, company, city, email)
- [ ] **READ**: View client list, search filters work
- [ ] **UPDATE**: Edit client details, save works
- [ ] **DELETE**: Delete a client, removed from list

### Telecalling (`/api/Telecalls`)
- [ ] **CREATE**: Add new telecall entry with customer name, number, date
- [ ] **READ**: View list, filter by date/staff/outcome
- [ ] **UPDATE**: Change outcome (New/Hot Case/Warm Case/Cold Case/Converted)
- [ ] **DELETE**: Delete entry
- [ ] Follow-up dates set and visible

### Walk-ins (`/api/Walkins`)
- [ ] **CREATE**: Log new walk-in visit
- [ ] **READ**: View walk-in list
- [ ] **UPDATE**: Update visit status
- [ ] **DELETE**: Remove entry

### Quotations (`/api/quotations`)
- [ ] **CREATE**: Generate quotation with line items, GST (18%), bank details
- [ ] **READ**: View quotation list and preview
- [ ] **UPDATE**: Edit quotation → version number increments
- [ ] **DELETE**: Delete quotation
- [ ] **PDF Download**: Click Download → PDF opens in browser / downloads
- [ ] Branch selector works (Coimbatore, Bangalore, Chennai)
- [ ] Bank details show (HDFC / Kotak)

### Invoices (`/api/invoice`, `/api/performainvoice`)
- [ ] **CREATE**: Create tax invoice with line items
- [ ] **READ**: View invoice list
- [ ] **UPDATE**: Edit invoice
- [ ] **PDF**: Download invoice PDF
- [ ] Proforma invoice creation works

### Contracts & AMC
- [ ] **CREATE**: New contract / AMC entry
- [ ] **READ**: View with service history
- [ ] **UPDATE**: Update contract status
- [ ] **DELETE**: Remove contract

### Tasks (`/api/task`)
- [ ] **CREATE**: Create task, assign to employee
- [ ] **READ**: View tasks by status (pending/in-progress/completed)
- [ ] **UPDATE**: Update task progress
- [ ] **DELETE**: Delete task

### Leads (`/api/leads`)
- [ ] **CREATE**: Add new lead with source and status
- [ ] **READ**: View leads pipeline
- [ ] **UPDATE**: Move lead to next stage
- [ ] **DELETE**: Remove lead

### Targets & Reports
- [ ] **CREATE**: Set monthly target for employee
- [ ] **READ**: View achievement % in reports dashboard
- [ ] Charts render (Recharts library)
- [ ] Export works

### Real-time Features
- [ ] Open two browser tabs with two different user logins
- [ ] Send chat message from Tab 1 → appears instantly in Tab 2 (Socket.IO)
- [ ] Notification bell shows count without page refresh
- [ ] After creating a record, other tabs auto-refresh (`data_changed` Socket.IO event)

### PDF Generation (Puppeteer)
- [ ] Download quotation PDF → generates correctly
- [ ] Download invoice PDF → generates correctly
- [ ] PDF contains ACHME logo, branch address, GST number, bank details

---

## 24. Troubleshooting Guide

### ❌ Backend won't start — "Missing required environment variables"
```bash
# Check all 5 required vars have values
cat /var/www/achme/backend/.env | grep -E "DB_HOST=|DB_USER=|DB_PASS=|DB_NAME=|JWT_SECRET="
# Fix any empty ones, then:
pm2 restart achme-backend && pm2 logs achme-backend --lines 20
```

### ❌ PM2 status shows `errored` — database connection failed
```bash
# Test MySQL connection manually
mysql -u achme_user -pAchmeSecure@2024 achme -e "SELECT 1;"
# If ERROR: check DB_PASS in .env matches what you set in MySQL

# Fix MySQL password:
sudo mysql -u root -p
ALTER USER 'achme_user'@'localhost' IDENTIFIED BY 'AchmeSecure@2024';
FLUSH PRIVILEGES;
EXIT;
pm2 restart achme-backend
```

### ❌ 502 Bad Gateway from Nginx
```bash
# Nginx can't reach backend — check if backend is running
pm2 status
# If not online:
pm2 start /var/www/achme/ecosystem.config.js --env production
# If online but still 502:
curl http://localhost:5000/api/health    # Is backend actually responding?
sudo tail -20 /var/log/nginx/achme-error.log   # Check Nginx error details
```

### ❌ React app loads but shows blank/white screen
```bash
# Check browser console (F12 → Console tab) for errors
# Common causes:

# 1. Wrong API URL — rebuild frontend
cat /var/www/achme/frontend/.env.production   # Must be: REACT_APP_API_URL=
cd /var/www/achme/frontend && npm run build

# 2. Nginx serving old cached files
sudo systemctl reload nginx

# 3. React build didn't complete
ls /var/www/achme/frontend/build/index.html   # Must exist
```

### ❌ CORS error in browser console
```bash
# Error: "Access to fetch at 'http://...' from origin '...' has been blocked by CORS"
# Fix: Add your LAN IP to ALLOWED_ORIGIN in .env
nano /var/www/achme/backend/.env
# ALLOWED_ORIGIN=http://192.168.1.100:82,http://achme.com
# (Use your actual IP, no trailing slash, no spaces)
pm2 reload achme-backend
```

### ❌ Port 82 not accessible from employee PCs
```bash
# Check port 82 is open in firewall
sudo ufw status | grep 82
# If missing:
sudo ufw allow 82/tcp && sudo ufw reload

# Check Nginx is actually listening on port 82
sudo ss -tlnp | grep ':82'

# Test from server itself
curl http://localhost:82/
# If this works but employee can't reach it:
# → They may be on a different network/subnet
# → Check router settings, same WiFi required
```

### ❌ Socket.IO / Chat not working
```bash
# Test Socket.IO directly
curl "http://localhost:82/socket.io/?EIO=4&transport=polling"
# Must return: 0{"sid":"...","upgrades":["websocket"],...}

# If 502/404: Check Nginx has the /socket.io/ location block
grep -A10 "socket.io" /etc/nginx/sites-available/achme
# Must show Upgrade and Connection headers

sudo nginx -t && sudo systemctl reload nginx
```

### ❌ PDF generation fails (Puppeteer error)
```bash
# Check error in logs
pm2 logs achme-backend | grep -i "puppeteer\|chrome\|pdf\|error"

# Install missing Chromium dependencies
sudo apt install -y libgbm1 libasound2 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libnss3

# Test PDF endpoint
curl -X POST http://localhost:82/api/quotations/1/pdf -H "Authorization: Bearer <token>"
```

### ❌ "achme.com" doesn't resolve in browser
```bash
# Confirm hosts file entry exists
cat /etc/hosts | grep achme
# Must show: 192.168.1.100    achme.com    www.achme.com

# Add it if missing:
echo "192.168.1.100    achme.com    www.achme.com" | sudo tee -a /etc/hosts

# On employee PCs — they need the same line in their hosts file
# Windows: C:\Windows\System32\drivers\etc\hosts  (open as Admin)
# Mac/Linux: /etc/hosts  (use sudo)
```

### ❌ After server reboot, nothing is running
```bash
# PM2 not configured for startup — run:
pm2 save
pm2 startup
# Copy+run the command it prints, then:
pm2 save

# Verify auto-start enabled:
sudo systemctl is-enabled nginx   # Should print: enabled
sudo systemctl is-enabled mysql   # Should print: enabled
pm2 list                           # Should show achme-backend online
```

---

## 25. Default Login Credentials

| Field | Value |
|-------|-------|
| **Admin Email** | `Kk@achmecommunication.com` |
| **Admin Password** | `kk@admin@123` |
| **Admin Emp ID** | `ADMIN001` |

> These credentials are seeded by `backend/config/database.js` function `seedDefaultEmployees()`.
> This function runs automatically **every time the backend starts**.
> So admin credentials always exist. To force reset: `pm2 restart achme-backend`
>
> **Roles in the system:**
> - `admin` — full access to all modules, user approval, reports
> - `employee` — limited to assigned modules, no user management
> - `subadmin` — like admin but with limited permissions

---

## 26. Port Map Summary

| Service | Port | Bound To | Accessible From | Notes |
|---------|------|----------|-----------------|-------|
| **Nginx** | **82** | `0.0.0.0` | All LAN devices | Primary access — use this |
| Node.js (Express) | 5000 | `0.0.0.0` | Localhost only (Nginx proxies) | Never expose directly |
| MySQL | 3306 | `127.0.0.1` | Localhost only | Backend connects internally |
| Socket.IO (WebSocket) | via 82 | via Nginx | All LAN devices | Proxied through Nginx |
| Optional redirect | 80 | `0.0.0.0` | All LAN devices | Redirects `http://achme.com` → `:82` |

---

## 27. ONE-SHOT Quick Command Reference

Copy and run each block in sequence for a full deploy from scratch on a fresh Ubuntu server:

```bash
# ════════════════════════════════════════════════════════════════
# BLOCK 1: System setup
# ════════════════════════════════════════════════════════════════
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx git
sudo npm install -g pm2
sudo apt install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
```

```bash
# ════════════════════════════════════════════════════════════════
# BLOCK 2: MySQL setup (run these SQL commands after: sudo mysql -u root -p)
# ════════════════════════════════════════════════════════════════
# CREATE DATABASE IF NOT EXISTS achme DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
# CREATE USER IF NOT EXISTS 'achme_user'@'localhost' IDENTIFIED BY 'AchmeSecure@2024';
# GRANT ALL PRIVILEGES ON achme.* TO 'achme_user'@'localhost';
# FLUSH PRIVILEGES;
# EXIT;
```

```bash
# ════════════════════════════════════════════════════════════════
# BLOCK 3: Clone and configure backend
# ════════════════════════════════════════════════════════════════
sudo mkdir -p /var/www/achme && sudo chown -R $USER:$USER /var/www/achme
cd /var/www && git clone https://github.com/Ananth-madura/ACHME_COMUNICATION.git achme
cd /var/www/achme/backend && cp .env.example .env
# ⚠️ EDIT .env now: nano /var/www/achme/backend/.env
# Set: DB_USER=achme_user, DB_PASS=AchmeSecure@2024, ALLOWED_ORIGIN=http://YOUR_IP:82,http://achme.com
npm install
node db_init.js  # Must show: ✅ Connected ... ✅ Database 'achme' exists
```

```bash
# ════════════════════════════════════════════════════════════════
# BLOCK 4: Build frontend
# ════════════════════════════════════════════════════════════════
echo "REACT_APP_API_URL=" > /var/www/achme/frontend/.env.production
cd /var/www/achme/frontend && npm install && npm run build
ls /var/www/achme/frontend/build/index.html  # Must exist
```

```bash
# ════════════════════════════════════════════════════════════════
# BLOCK 5: PM2 start
# ════════════════════════════════════════════════════════════════
sudo mkdir -p /var/log/achme && sudo chown -R $USER:$USER /var/log/achme
pm2 start /var/www/achme/ecosystem.config.js --env production
pm2 status   # Must show: achme-backend | online
curl http://localhost:5000/api/health   # Must return ok:true
```

```bash
# ════════════════════════════════════════════════════════════════
# BLOCK 6: Nginx configure
# ════════════════════════════════════════════════════════════════
sudo rm -f /etc/nginx/sites-enabled/default
# ⚠️ Create /etc/nginx/sites-available/achme — paste full config from Step 11 above
sudo ln -sf /etc/nginx/sites-available/achme /etc/nginx/sites-enabled/achme
sudo nginx -t && sudo systemctl reload nginx
curl http://localhost:82/api/health   # Must return ok:true
```

```bash
# ════════════════════════════════════════════════════════════════
# BLOCK 7: Firewall + auto-start
# ════════════════════════════════════════════════════════════════
sudo ufw allow 22/tcp && sudo ufw allow 82/tcp && sudo ufw allow 80/tcp && sudo ufw enable
pm2 save && pm2 startup
# ⚠️ Copy+run the command pm2 startup prints
pm2 save
echo "192.168.1.100    achme.com    www.achme.com" | sudo tee -a /etc/hosts
```

```bash
# ════════════════════════════════════════════════════════════════
# BLOCK 8: Final verification
# ════════════════════════════════════════════════════════════════
pm2 status
curl http://localhost:82/api/health
curl -X POST http://localhost:82/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Kk@achmecommunication.com","password":"kk@admin@123"}'
echo ""
echo "🚀 ACHME CRM is LIVE!"
echo "   http://YOUR_LAN_IP:82"
echo "   http://achme.com"
echo "   Login: Kk@achmecommunication.com / kk@admin@123"
```

---

## After Every Code Update

```bash
cd /var/www/achme
git pull origin main                              # Pull latest code from GitHub

# Restart backend (picks up new backend code)
pm2 reload achme-backend                         # Graceful zero-downtime reload

# If frontend code changed (src/ files):
cd /var/www/achme/frontend && npm run build      # Rebuild React bundle
sudo systemctl reload nginx                       # Optional: clear Nginx cache

# Verify everything still works
curl http://localhost:82/api/health               # Must return ok:true
pm2 status                                        # Must show online
```

---

*Guide for: **ACHME Communication CRM***
*Stack: React 19 · Express 5 · MySQL 8 · Socket.IO 4 · Nginx · PM2 · Puppeteer*
*GitHub: https://github.com/Ananth-madura/ACHME_COMUNICATION*
*Branches: Coimbatore · Bangalore · Chennai*
*GSTIN (CBE/CHE): 33AAHFA7876M1ZX · GSTIN (BLR): 29AAHFA7876M1ZM*
*Bank: HDFC (00312320005822 / HDFC0000031) · Kotak (9211242667 / KKBK0000491)*
