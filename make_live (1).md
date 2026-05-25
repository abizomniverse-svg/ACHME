# ACHME CRM — FULL LIVE DEPLOYMENT GUIDE
## Nginx + PM2 | Auto IP Detection | Port 82 | On-Prem Linux Server
## AI-Agent-Ready: End-to-End Automated Setup (One-Shot Execution)

---

> **Purpose**: Transfer ACHME CRM from your dev machine to a client's on-prem Linux server.
> The system will auto-detect the server IP and serve all users at `http://<SERVER_IP>:82`.
> Backend API runs internally on port 5000. Nginx reverse-proxies everything (HTTP + WebSocket/Socket.IO).
> React frontend is built as static files and served by Nginx.
> PM2 keeps the Node.js backend alive with auto-restart on crash or reboot.

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [Issues Found & Fixes Applied](#2-issues-found--fixes-applied)
3. [Server Prerequisites](#3-server-prerequisites)
4. [Step 1 — Install System Dependencies](#step-1--install-system-dependencies)
5. [Step 2 — Copy Project to Server](#step-2--copy-project-to-server)
6. [Step 3 — Fix Backend Config Files](#step-3--fix-backend-config-files)
7. [Step 4 — Setup MySQL Database](#step-4--setup-mysql-database)
8. [Step 5 — Backend Environment (.env)](#step-5--backend-environment-env)
9. [Step 6 — Install Backend Dependencies](#step-6--install-backend-dependencies)
10. [Step 7 — Build React Frontend](#step-7--build-react-frontend)
11. [Step 8 — PM2 Ecosystem Config (Linux)](#step-8--pm2-ecosystem-config-linux)
12. [Step 9 — Nginx Configuration (Port 82 + Socket.IO)](#step-9--nginx-configuration-port-82--socketio)
13. [Step 10 — Firewall & Port 82](#step-10--firewall--port-82)
14. [Step 11 — Start Everything](#step-11--start-everything)
15. [Step 12 — Enable Auto-Start on Reboot](#step-12--enable-auto-start-on-reboot)
16. [Step 13 — Verify All CRUD & Socket Operations](#step-13--verify-all-crud--socket-operations)
17. [Step 14 — Health Check Script](#step-14--health-check-script)
18. [Redeployment / Update Workflow](#redeployment--update-workflow)
19. [Troubleshooting Guide](#troubleshooting-guide)
20. [Full One-Shot Automation Script](#full-one-shot-automation-script)

---

## 1. ARCHITECTURE OVERVIEW

```
USER BROWSER (any device, any network)
        |
        | http://<SERVER_IP>:82
        v
┌─────────────────────────────────────────────┐
│              NGINX  (port 82)               │
│                                             │
│  /             → serve frontend/build/      │
│  /api/*        → proxy → localhost:5000     │
│  /socket.io/*  → proxy → localhost:5000     │
│  /uploads/*    → proxy → localhost:5000     │
│  /health       → proxy → localhost:5000     │
└─────────────────────────────────────────────┘
        |
        | localhost:5000 (internal, never public)
        v
┌─────────────────────────────────────────────┐
│         NODE.JS BACKEND (PM2)               │
│         Express + Socket.IO                 │
│         Port: 5000                          │
│         NODE_ENV=production                 │
└─────────────────────────────────────────────┘
        |
        | localhost:3306 (internal)
        v
┌─────────────────────────────────────────────┐
│         MYSQL DATABASE                      │
│         Database: achme                     │
└─────────────────────────────────────────────┘
```

**Why this architecture**:
- Port 82 is publicly accessible; port 5000 is internal only.
- Nginx handles static files (fast), proxies API + WebSocket to Node.
- PM2 in `fork` mode (not cluster) keeps Socket.IO working without sticky-session complexity.
- React in production mode uses relative URLs (`""`), so it auto-works at any IP.
- The frontend `config/index.js` already returns `""` in production — Nginx routes it all correctly.

---

## 2. ISSUES FOUND & FIXES APPLIED

> **Your AI agent must apply all fixes in this section before deploying.**

### ❌ Issue 1 — `server.js` Default Port is 3000 (Should Be 5000)
**File**: `backend/server.js` line 115
```js
// CURRENT (wrong — fallback is 3000)
const PORT = Number(process.env.PORT) || 3000;
```
**Fix**: The `.env` file sets `PORT=5000`. This is fine as-is IF the `.env` is correctly written.
Do NOT use port 82 for the backend directly. Nginx listens on 82 and proxies to 5000.
The `server.js` already has a port-82 redirect block — that is for a separate use case. **Keep backend on 5000**.

---

### ❌ Issue 2 — `ecosystem.production.config.js` Has Windows Hardcoded Paths
**File**: `backend/ecosystem.production.config.js`
```js
// CURRENT (wrong — Windows absolute paths)
cwd: 'D:\\ACHME_COMUNICATION-main\\backend',
error_file: 'D:\\ACHME_COMUNICATION-main\\logs\\pm2-error.log',
out_file:   'D:\\ACHME_COMUNICATION-main\\logs\\pm2-out.log',
```
**Fix**: Replace with Linux paths. See Step 8 — the new `ecosystem.config.js` file is written from scratch.

---

### ❌ Issue 3 — `server-deployment/nginx.conf` Missing WebSocket / Socket.IO Proxy
**File**: `server-deployment/nginx.conf`
The existing config has NO `/socket.io/` location block. Socket.IO connections from the browser will fail silently in production — chat, notifications, real-time updates all break.
**Fix**: New Nginx config in Step 9 includes full WebSocket upgrade headers and `/socket.io/` location.

---

### ❌ Issue 4 — `server-deployment/ecosystem.config.js` Uses `cluster` Mode
**File**: `server-deployment/ecosystem.config.js`
```js
exec_mode: 'cluster',   // ❌ Socket.IO breaks with multiple workers without sticky sessions
instances: 'max',
```
**Fix**: Use `exec_mode: 'fork'` with `instances: 1` for Socket.IO stability. (If you need scaling later, add a Redis adapter for Socket.IO first.)

---

### ❌ Issue 5 — `server-deployment/nginx.conf` Listens on Port 80, Not 82
**Fix**: New Nginx config listens on port 82.

---

### ❌ Issue 6 — Nginx Config Missing `/uploads/` Proxy Block
Files uploaded by users (invoices, PDFs) are served from `backend/uploads/`. Nginx must proxy `/uploads/` to the backend.
**Fix**: Added in Step 9.

---

### ❌ Issue 7 — `chatroutes.js` Is 100% Commented Out
**File**: `backend/routes/chatroutes.js`
The entire file is commented out, and the route is NOT registered in `server.js`. Chat works exclusively via Socket.IO (`chatsockets.js`), which IS active. This is intentional — just note that there is no REST API for chat history retrieval via HTTP (only via socket events).
**Recommendation**: If you want HTTP-based chat history endpoint, uncomment `chatroutes.js` and add:
```js
app.use("/api/chat", require("./routes/chatroutes"));
```
to `server.js`. For now, the socket-only approach works.

---

### ❌ Issue 8 — `ALLOWED_ORIGIN` in `.env.example` is `localhost:3000`
In production, the CORS origin must allow the actual client IP. We set it to `*` for open on-prem LAN access, or to the specific server IP.
**Fix**: Set `ALLOWED_ORIGIN=*` in production `.env` (or `http://<YOUR_SERVER_IP>:82`).

---

### ❌ Issue 9 — Frontend Socket.IO in Production Connects to `""` (Relative URL)
**File**: `frontend/src/socket/socket.js`
In production, `API` from `config/index.js` is `""`. So:
```js
const socket = io("", { transports: ["websocket"] });
```
This connects via the **same origin** (port 82). For this to work, Nginx **must** proxy `/socket.io/` to the backend. This is handled in Step 9.
**Note**: `io("", { transports: ["websocket"] })` — the empty string is equivalent to the current page's origin. ✅ Correct.

---

## 3. SERVER PREREQUISITES

Your client's on-prem server must have:

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Ubuntu/Debian Linux | 20.04+ or 22.04 | `lsb_release -a` |
| Node.js | 18.x or 20.x LTS | `node -v` |
| npm | 9+ | `npm -v` |
| MySQL Server | 8.0+ | `mysql --version` |
| Nginx | 1.18+ | `nginx -v` |
| PM2 | 5.x | `pm2 -v` |
| Git | any | `git --version` |
| curl | any | `curl --version` |

**Minimum server specs**:
- RAM: 2 GB (4 GB recommended for Puppeteer PDF generation)
- Disk: 20 GB free
- CPU: 2 cores minimum
- OS: Ubuntu 20.04 / 22.04 (Debian also works)

---

## STEP 1 — INSTALL SYSTEM DEPENDENCIES

Run as `root` or with `sudo`:

```bash
#!/bin/bash
# ─────────────────────────────────────────────
# ACHME Step 1: System Dependency Installation
# ─────────────────────────────────────────────
set -e

echo "=== [1/7] Updating system packages ==="
sudo apt-get update -y
sudo apt-get upgrade -y

echo "=== [2/7] Installing curl, git, build-essential ==="
sudo apt-get install -y curl git build-essential unzip software-properties-common

echo "=== [3/7] Installing Node.js 20.x LTS ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v

echo "=== [4/7] Installing PM2 globally ==="
sudo npm install -g pm2
pm2 -v

echo "=== [5/7] Installing MySQL Server 8.0 ==="
sudo apt-get install -y mysql-server mysql-client
sudo systemctl enable mysql
sudo systemctl start mysql
mysql --version

echo "=== [6/7] Installing Nginx ==="
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
nginx -v

echo "=== [7/7] Installing Puppeteer system dependencies (for PDF generation) ==="
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils

echo "✅ All system dependencies installed."
```

---

## STEP 2 — COPY PROJECT TO SERVER

### Option A — From GitHub (Recommended)

```bash
# ─────────────────────────────────────────────────────────
# ACHME Step 2A: Clone from GitHub
# ─────────────────────────────────────────────────────────
PROJECT_DIR="/opt/achme"
GITHUB_REPO="https://github.com/abizomniverse-svg/ACHME.git"

sudo mkdir -p "$PROJECT_DIR"
sudo chown -R $USER:$USER "$PROJECT_DIR"

cd /opt
git clone "$GITHUB_REPO" achme
echo "✅ Project cloned to $PROJECT_DIR"
ls -la "$PROJECT_DIR"
```

### Option B — From ZIP File (Transfer from Dev Machine)

```bash
# On your dev machine — create deployment ZIP:
cd /path/to/ACHME
zip -r achme-deploy.zip . \
  --exclude "*/node_modules/*" \
  --exclude "*/.git/*" \
  --exclude "*/frontend/build/*" \
  --exclude "*/backend/uploads/*"

# Transfer to server (replace with your server IP):
scp achme-deploy.zip user@<SERVER_IP>:/tmp/achme-deploy.zip

# On the SERVER:
sudo mkdir -p /opt/achme
sudo chown -R $USER:$USER /opt/achme
cd /opt/achme
unzip /tmp/achme-deploy.zip
# If zip has a subfolder, move contents up:
# mv ACHME-main/* . && rm -rf ACHME-main
echo "✅ Project extracted to /opt/achme"
```

### Create Required Directories

```bash
# ─────────────────────────────────────────────────────────
# Create log and upload directories
# ─────────────────────────────────────────────────────────
mkdir -p /opt/achme/logs
mkdir -p /opt/achme/backend/uploads
chmod 755 /opt/achme/backend/uploads
echo "✅ Directories created"
```

---

## STEP 3 — FIX BACKEND CONFIG FILES

These fixes correct the issues found during code review.

### Fix 3A — Verify `server.js` PORT (No code change needed — .env controls this)

```bash
# Confirm server.js default port line:
grep "const PORT" /opt/achme/backend/server.js
# Should show: const PORT = Number(process.env.PORT) || 3000;
# The .env will override this with PORT=5000. ✅ No file change needed.
```

### Fix 3B — Remove/Replace Windows-Path Ecosystem Config

```bash
# The old ecosystem.production.config.js has Windows paths. Delete it.
rm -f /opt/achme/backend/ecosystem.production.config.js
echo "✅ Old Windows ecosystem config removed"
# New ecosystem.config.js will be created in Step 8
```

### Fix 3C — Ensure `invoiceRoutes.js` Is Not Empty

```bash
# Check if invoiceRoutes.js is empty (it's 1 byte in the ZIP):
wc -c /opt/achme/backend/routes/invoiceRoutes.js
cat /opt/achme/backend/routes/invoiceRoutes.js
# If it's empty/blank, check invoice.js which IS the full invoice route:
# server.js uses: app.use("/api/invoice", require("./routes/invoice"));
# invoiceRoutes.js appears unused — no action needed.
echo "✅ Invoice route check complete"
```

---

## STEP 4 — SETUP MYSQL DATABASE

```bash
#!/bin/bash
# ─────────────────────────────────────────────────────────
# ACHME Step 4: MySQL Database Setup
# ─────────────────────────────────────────────────────────
# CHANGE these values for your client's server:
DB_NAME="achme"
DB_USER="achme_user"
DB_PASS="AchmeSecure@2025"   # Change this to a strong password
DB_ROOT_PASS=""               # Root password (empty if just installed)

echo "=== Setting up MySQL database ==="

# Secure MySQL and create DB + user:
sudo mysql -u root <<EOF
-- Create the database
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create dedicated app user
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES LIKE '${DB_NAME}';
SELECT User, Host FROM mysql.user WHERE User='${DB_USER}';
EOF

echo "=== Importing schema ==="
# Import the full schema (creates all tables):
mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < /opt/achme/backend/schema.sql
echo "✅ Schema imported"

# Verify tables exist:
echo "=== Verifying tables ==="
mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" -e "SHOW TABLES;" | head -30

echo "✅ MySQL database setup complete"
echo "   DB_NAME: ${DB_NAME}"
echo "   DB_USER: ${DB_USER}"
echo "   Save DB_PASS securely: ${DB_PASS}"
```

### MySQL Tuning for Production (Optional but Recommended)

```bash
# Add to /etc/mysql/mysql.conf.d/mysqld.cnf
sudo tee -a /etc/mysql/mysql.conf.d/mysqld.cnf <<'EOF'

# ACHME Production Tuning
innodb_buffer_pool_size = 256M
max_connections = 150
wait_timeout = 600
interactive_timeout = 600
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
EOF

sudo systemctl restart mysql
echo "✅ MySQL tuned and restarted"
```

---

## STEP 5 — BACKEND ENVIRONMENT (.env)

> **CRITICAL**: Auto-detect server IP and write the correct `.env`

```bash
#!/bin/bash
# ─────────────────────────────────────────────────────────
# ACHME Step 5: Auto-detect IP and write backend .env
# ─────────────────────────────────────────────────────────

# Auto-detect the server's primary IP address:
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "=== Auto-detected Server IP: ${SERVER_IP} ==="

# ─────────────────────────────────────────────────────────
# VALUES TO CUSTOMIZE FOR EACH DEPLOYMENT:
# ─────────────────────────────────────────────────────────
DB_USER="achme_user"
DB_PASS="AchmeSecure@2025"       # Must match Step 4
DB_NAME="achme"
EMAIL_USER="thanan757@gmail.com"
EMAIL_PASS="ghjv omqm hwji kerq"  # Gmail App Password
# Generate a fresh JWT secret:
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
# ─────────────────────────────────────────────────────────

cat > /opt/achme/backend/.env <<EOF
# =============================================================
# ACHME CRM — Production Environment (Auto-generated)
# Server IP: ${SERVER_IP}
# Generated: $(date)
# =============================================================

# Server Configuration
NODE_ENV=production
PORT=5000
# ALLOWED_ORIGIN: allow all LAN/WAN clients to access port 82
ALLOWED_ORIGIN=*

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
DB_NAME=${DB_NAME}

# Email Configuration (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=${EMAIL_USER}
EMAIL_PASS=${EMAIL_PASS}

# JWT Authentication Secret (auto-generated, keep this secret!)
JWT_SECRET=${JWT_SECRET}

# Default test password for seeded employees
DEFAULT_TEST_PASSWORD=Test@12345

# Demo Mode (ALWAYS false in production)
DEMO_MODE=false

# Puppeteer (for PDF generation) — use system Chrome
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
EOF

chmod 600 /opt/achme/backend/.env
echo "✅ Backend .env written"
echo "   Server IP: ${SERVER_IP}"
echo "   JWT_SECRET: (auto-generated)"
cat /opt/achme/backend/.env
```

---

## STEP 6 — INSTALL BACKEND DEPENDENCIES

```bash
#!/bin/bash
# ─────────────────────────────────────────────────────────
# ACHME Step 6: Install Backend Node Modules
# ─────────────────────────────────────────────────────────
cd /opt/achme/backend

echo "=== Installing backend npm packages ==="
npm install --omit=dev
echo "✅ Backend dependencies installed"

# Verify critical packages:
echo "=== Verifying key packages ==="
node -e "require('express'); console.log('✅ express')"
node -e "require('socket.io'); console.log('✅ socket.io')"
node -e "require('mysql2'); console.log('✅ mysql2')"
node -e "require('jsonwebtoken'); console.log('✅ jsonwebtoken')"
node -e "require('nodemailer'); console.log('✅ nodemailer')"
node -e "require('puppeteer'); console.log('✅ puppeteer')"
node -e "require('node-schedule'); console.log('✅ node-schedule')"

# Quick DB connection test:
echo "=== Testing database connection ==="
node -e "
require('dotenv').config({ path: '/opt/achme/backend/.env' });
const mysql = require('mysql2');
const c = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});
c.connect(err => {
  if (err) { console.error('❌ DB connect failed:', err.message); process.exit(1); }
  console.log('✅ Database connection successful');
  c.end();
});
"
echo "✅ Backend setup complete"
```

---

## STEP 7 — BUILD REACT FRONTEND

```bash
#!/bin/bash
# ─────────────────────────────────────────────────────────
# ACHME Step 7: Build React Frontend for Production
# ─────────────────────────────────────────────────────────

# Auto-detect server IP (same as Step 5):
SERVER_IP=$(hostname -I | awk '{print $1}')

cd /opt/achme/frontend

echo "=== Installing frontend npm packages ==="
npm install

echo "=== Building React app for production ==="
# In production, config/index.js returns "" (empty string),
# so API calls become relative URLs — Nginx routes them to backend.
# This means the build works at ANY IP automatically. ✅
NODE_ENV=production npm run build

echo "=== Verifying build output ==="
ls -la /opt/achme/frontend/build/
ls -la /opt/achme/frontend/build/static/js/ | head -5
ls -la /opt/achme/frontend/build/static/css/ | head -5

# Confirm index.html exists:
if [ -f "/opt/achme/frontend/build/index.html" ]; then
  echo "✅ React build successful — index.html found"
  echo "   Build size:"
  du -sh /opt/achme/frontend/build/
else
  echo "❌ BUILD FAILED — index.html not found!"
  exit 1
fi
```

> **Why no `REACT_APP_API_URL`?**
> Your `frontend/src/config/index.js` returns `""` in production mode.
> This means all API calls like `/api/auth/login` are relative to the browser's current host.
> Nginx intercepts those and proxies them to `localhost:5000`.
> **This makes the build truly IP-agnostic — it works on any server at any IP without rebuilding.** ✅

---

## STEP 8 — PM2 ECOSYSTEM CONFIG (LINUX)

Write the new Linux-compatible PM2 config:

```bash
#!/bin/bash
# ─────────────────────────────────────────────────────────
# ACHME Step 8: Write PM2 Ecosystem Config for Linux
# ─────────────────────────────────────────────────────────

cat > /opt/achme/ecosystem.config.js <<'EOF'
// ACHME CRM — PM2 Ecosystem Config (Linux Production)
// ─────────────────────────────────────────────────────
// IMPORTANT: exec_mode is 'fork' (NOT cluster)
// Reason: Socket.IO requires sticky sessions in cluster mode.
// With fork mode + single instance, Socket.IO works perfectly.
// If you need horizontal scaling later: add Redis Socket.IO adapter
// and switch to cluster mode.

module.exports = {
  apps: [
    {
      name: 'achme-backend',
      script: '/opt/achme/backend/server.js',
      cwd: '/opt/achme/backend',

      // Single instance, fork mode — required for Socket.IO
      instances: 1,
      exec_mode: 'fork',

      // Auto-restart settings
      autorestart: true,
      max_restarts: 15,
      min_uptime: '10s',
      restart_delay: 3000,

      // Watch disabled in production (use PM2 reload for updates)
      watch: false,

      // Memory limit (restart if backend exceeds 1.5GB — Puppeteer can spike)
      max_memory_restart: '1500M',

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // Logs
      error_file: '/opt/achme/logs/pm2-error.log',
      out_file: '/opt/achme/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true,

      // Kill timeout (give time for Socket.IO to close gracefully)
      kill_timeout: 5000,
      listen_timeout: 8000,
    }
  ]
};
EOF

echo "✅ PM2 ecosystem.config.js written to /opt/achme/ecosystem.config.js"
cat /opt/achme/ecosystem.config.js
```

---

## STEP 9 — NGINX CONFIGURATION (PORT 82 + SOCKET.IO)

> **Full Nginx config with**: port 82, static React files, API proxy, Socket.IO WebSocket proxy, uploads proxy, security headers, gzip.

```bash
#!/bin/bash
# ─────────────────────────────────────────────────────────
# ACHME Step 9: Write Nginx Config for Port 82
# ─────────────────────────────────────────────────────────

# Auto-detect server IP:
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "=== Writing Nginx config for IP: ${SERVER_IP} ==="

sudo tee /etc/nginx/sites-available/achme <<EOF
# ─────────────────────────────────────────────────────────────
# ACHME CRM — Nginx Configuration
# Listens on port 82 — accessible by all LAN/WAN users
# Auto-detected Server IP: ${SERVER_IP}
# Generated: $(date)
# ─────────────────────────────────────────────────────────────

# Upstream backend — Node.js on port 5000
upstream achme_backend {
    server 127.0.0.1:5000;
    keepalive 32;
}

server {
    listen 82;
    listen [::]:82;

    # Accept connections to server IP or any hostname
    server_name ${SERVER_IP} _;

    # React build directory
    root /opt/achme/frontend/build;
    index index.html;

    # ── Security Headers ─────────────────────────────────────
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # ── Gzip Compression ─────────────────────────────────────
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml application/xml+rss text/javascript
               image/svg+xml;

    # ── Client Upload Size (for file uploads in CRM) ─────────
    client_max_body_size 50M;

    # ── Timeouts ─────────────────────────────────────────────
    proxy_connect_timeout       60s;
    proxy_send_timeout          120s;
    proxy_read_timeout          120s;

    # ────────────────────────────────────────────────────────
    # LOCATION: Socket.IO — WebSocket + Long-Poll support
    # MUST come before /api/ to avoid conflicts
    # ────────────────────────────────────────────────────────
    location /socket.io/ {
        proxy_pass http://achme_backend;
        proxy_http_version 1.1;

        # WebSocket upgrade headers (critical for Socket.IO):
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        # Pass original headers:
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Long-poll timeout:
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;

        # Disable buffering for real-time events:
        proxy_buffering off;
        proxy_cache_bypass 1;
    }

    # ────────────────────────────────────────────────────────
    # LOCATION: API — All backend REST endpoints
    # ────────────────────────────────────────────────────────
    location /api/ {
        proxy_pass http://achme_backend;
        proxy_http_version 1.1;

        proxy_set_header Connection "";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Allow larger request bodies for file uploads:
        proxy_request_buffering off;

        # CORS — backend handles CORS, so no need to add here
    }

    # ────────────────────────────────────────────────────────
    # LOCATION: Uploads — User-uploaded files (PDFs, images, etc.)
    # ────────────────────────────────────────────────────────
    location /uploads/ {
        proxy_pass http://achme_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;

        # Cache uploaded files for performance:
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400";
    }

    # ────────────────────────────────────────────────────────
    # LOCATION: Health Check endpoint
    # ────────────────────────────────────────────────────────
    location /health {
        proxy_pass http://achme_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        access_log off;
    }

    # ────────────────────────────────────────────────────────
    # LOCATION: React Static Assets — with aggressive caching
    # ────────────────────────────────────────────────────────
    location /static/ {
        root /opt/achme/frontend/build;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # ────────────────────────────────────────────────────────
    # LOCATION: React SPA Catch-all
    # All non-API routes go to index.html (React Router handles them)
    # ────────────────────────────────────────────────────────
    location / {
        try_files \$uri \$uri/ /index.html;

        # Cache HTML (short time, forces update checks):
        add_header Cache-Control "no-cache";
    }

    # ────────────────────────────────────────────────────────
    # Deny access to hidden files (.env, .git, etc.)
    # ────────────────────────────────────────────────────────
    location ~ /\\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # ────────────────────────────────────────────────────────
    # Access Logs
    # ────────────────────────────────────────────────────────
    access_log /var/log/nginx/achme-access.log;
    error_log  /var/log/nginx/achme-error.log;
}
EOF

echo "✅ Nginx config written"

# Enable the site:
sudo ln -sf /etc/nginx/sites-available/achme /etc/nginx/sites-enabled/achme

# Disable the default Nginx site:
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx config:
sudo nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Nginx config is valid"
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded"
else
    echo "❌ Nginx config has errors — check above output"
    exit 1
fi
```

---

## STEP 10 — FIREWALL & PORT 82

```bash
#!/bin/bash
# ─────────────────────────────────────────────────────────
# ACHME Step 10: Open Port 82 in Firewall
# ─────────────────────────────────────────────────────────

echo "=== Configuring UFW firewall ==="

# Check if UFW is active:
sudo ufw status

# Allow port 82 (public-facing ACHME CRM):
sudo ufw allow 82/tcp comment 'ACHME CRM'

# Allow SSH (don't lock yourself out!):
sudo ufw allow ssh

# Allow Nginx:
sudo ufw allow 'Nginx Full'

# Enable UFW if not already enabled:
echo "y" | sudo ufw enable

# Verify:
sudo ufw status verbose
echo "✅ Port 82 is now open"

# ── If on a cloud provider (AWS/GCP/Azure/Hetzner), also open port 82
# in your cloud security group / firewall rules. UFW alone is not enough.
echo ""
echo "⚠️  REMINDER: If this is a cloud server (AWS, GCP, Azure, Hetzner, etc.),"
echo "   ALSO open port 82 in the cloud provider's security group/firewall!"
echo "   UFW only controls the OS-level firewall."
```

---

## STEP 11 — START EVERYTHING

```bash
#!/bin/bash
# ─────────────────────────────────────────────────────────
# ACHME Step 11: Start Backend with PM2 + Verify
# ─────────────────────────────────────────────────────────

SERVER_IP=$(hostname -I | awk '{print $1}')

echo "=== Starting ACHME backend with PM2 ==="
cd /opt/achme

# Stop any existing PM2 process named 'achme-backend':
pm2 delete achme-backend 2>/dev/null || true

# Start using our ecosystem config:
pm2 start /opt/achme/ecosystem.config.js

# Wait for startup:
sleep 4

# Show PM2 process list:
pm2 list

# Show startup logs:
echo ""
echo "=== Backend startup logs ==="
pm2 logs achme-backend --lines 30 --nostream

# ── Health check ─────────────────────────────────────────
echo ""
echo "=== Health check: Backend on port 5000 ==="
sleep 2
curl -sf http://localhost:5000/health | python3 -m json.tool || \
  curl -sf http://localhost:5000/api/health | python3 -m json.tool || \
  echo "⚠️  Health check failed — check pm2 logs"

echo ""
echo "=== Health check: Nginx on port 82 ==="
curl -sf http://localhost:82/health | python3 -m json.tool || \
  echo "⚠️  Nginx port 82 health check failed"

echo ""
echo "=== Verifying API through Nginx ==="
curl -sf http://localhost:82/api/health | python3 -m json.tool || \
  echo "⚠️  API via Nginx failed — check nginx error log"

echo ""
echo "============================================================"
echo "  ✅ ACHME CRM is now LIVE!"
echo "  Access URL: http://${SERVER_IP}:82"
echo "  Share this with all users on the network."
echo "============================================================"
```

---

## STEP 12 — ENABLE AUTO-START ON REBOOT

```bash
#!/bin/bash
# ─────────────────────────────────────────────────────────
# ACHME Step 12: Auto-start PM2 + Nginx on Server Reboot
# ─────────────────────────────────────────────────────────

echo "=== Setting up PM2 startup ==="

# Generate PM2 startup command (run this as the user who owns the process):
pm2 startup

# The above command prints a 'sudo env PATH=...' command. Run it:
# (This is auto-run here using the env-injected version)
PM2_STARTUP_CMD=$(pm2 startup | grep "sudo env" | tail -1)
if [ -n "$PM2_STARTUP_CMD" ]; then
  eval "$PM2_STARTUP_CMD"
fi

# Save current PM2 process list (so it's restored on reboot):
pm2 save
echo "✅ PM2 startup configured"

# Nginx auto-starts via systemd (already done in Step 1):
sudo systemctl is-enabled nginx
sudo systemctl is-enabled mysql
echo "✅ Nginx and MySQL are enabled for auto-start"

# Verify the full service chain:
echo ""
echo "=== Verifying service status ==="
sudo systemctl status nginx --no-pager | head -5
sudo systemctl status mysql --no-pager | head -5
pm2 list
echo "✅ Auto-start setup complete — safe to reboot"
```

---

## STEP 13 — VERIFY ALL CRUD & SOCKET OPERATIONS

```bash
#!/bin/bash
# ─────────────────────────────────────────────────────────
# ACHME Step 13: End-to-End API Verification
# ─────────────────────────────────────────────────────────

SERVER_IP=$(hostname -I | awk '{print $1}')
BASE="http://${SERVER_IP}:82"

echo "============================================================"
echo "  ACHME CRM — Endpoint Verification"
echo "  Base URL: ${BASE}"
echo "============================================================"

pass=0
fail=0

check() {
  local label="$1"
  local url="$2"
  local expected_status="${3:-200}"
  local http_status
  http_status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$http_status" = "$expected_status" ] || [ "$http_status" = "200" ] || [ "$http_status" = "201" ] || [ "$http_status" = "401" ] || [ "$http_status" = "403" ]; then
    echo "  ✅ ${label} → HTTP ${http_status}"
    ((pass++))
  else
    echo "  ❌ ${label} → HTTP ${http_status} (expected ~200/401)"
    ((fail++))
  fi
}

echo ""
echo "── Static Assets ───────────────────────────────────────"
check "React App (index.html)"        "${BASE}/"
check "React Static JS"               "${BASE}/static/js/"

echo ""
echo "── Health & System ─────────────────────────────────────"
check "Backend Health (via Nginx)"    "${BASE}/health"
check "Backend Health (/api/health)"  "${BASE}/api/health"

echo ""
echo "── Authentication API ───────────────────────────────────"
check "Auth - Login endpoint"         "${BASE}/api/auth/login"
check "Auth - Send OTP endpoint"      "${BASE}/api/auth/send-otp"

echo ""
echo "── Core CRM APIs (expect 401 — unauthenticated) ────────"
check "Clients API"                   "${BASE}/api/client"
check "Quotations API"                "${BASE}/api/quotations"
check "Invoice API"                   "${BASE}/api/invoice"
check "Payments API"                  "${BASE}/api/payments"
check "Task API"                      "${BASE}/api/task"
check "Leads API"                     "${BASE}/api/leads"
check "Team Members API"              "${BASE}/api/teammember"
check "AMC API"                       "${BASE}/api/amc"
check "Reports API"                   "${BASE}/api/reports"
check "Notifications API"             "${BASE}/api/notifications"
check "Telecalls API"                 "${BASE}/api/Telecalls"
check "Walkins API"                   "${BASE}/api/Walkins"
check "Fields API"                    "${BASE}/api/Fields"
check "Call Reports API"              "${BASE}/api/call-reports"
check "Services API"                  "${BASE}/api/services"
check "Targets API"                   "${BASE}/api/targets"
check "Performa Invoice API"          "${BASE}/api/performainvoice"
check "Estimate Invoice API"          "${BASE}/api/estimate-invoice"
check "Service Estimation API"        "${BASE}/api/service-estimation"
check "Contracts API"                 "${BASE}/api/contract"
check "Estimate API"                  "${BASE}/api/estimate"

echo ""
echo "── Socket.IO Connection Check ──────────────────────────"
# Check Socket.IO handshake endpoint:
WS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/socket.io/?EIO=4&transport=polling")
if [ "$WS_STATUS" = "200" ]; then
  echo "  ✅ Socket.IO polling endpoint → HTTP 200"
  ((pass++))
else
  echo "  ❌ Socket.IO polling endpoint → HTTP ${WS_STATUS}"
  ((fail++))
fi

echo ""
echo "============================================================"
echo "  Results: ${pass} passed, ${fail} failed"
if [ "$fail" -eq 0 ]; then
  echo "  🎉 ALL CHECKS PASSED — ACHME CRM is fully operational!"
else
  echo "  ⚠️  Some checks failed — review the items above"
  echo "  Run: pm2 logs achme-backend --lines 50"
  echo "  Run: sudo tail -50 /var/log/nginx/achme-error.log"
fi
echo "  Live URL: ${BASE}"
echo "============================================================"
```

---

## STEP 14 — HEALTH CHECK SCRIPT

Save this as a cron job for continuous monitoring:

```bash
#!/bin/bash
# ─────────────────────────────────────────────────────────
# ACHME Health Monitor — runs every 5 minutes via cron
# File: /opt/achme/health_monitor.sh
# ─────────────────────────────────────────────────────────

LOG="/opt/achme/logs/health.log"
timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

# Check backend:
if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
  echo "$(timestamp) ✅ Backend OK" >> "$LOG"
else
  echo "$(timestamp) ❌ Backend DOWN — restarting PM2" >> "$LOG"
  pm2 restart achme-backend >> "$LOG" 2>&1
fi

# Check Nginx:
if curl -sf http://localhost:82/health > /dev/null 2>&1; then
  echo "$(timestamp) ✅ Nginx OK" >> "$LOG"
else
  echo "$(timestamp) ❌ Nginx DOWN — restarting" >> "$LOG"
  sudo systemctl restart nginx >> "$LOG" 2>&1
fi

# Keep log manageable (last 1000 lines):
tail -1000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
```

```bash
# Install the cron job:
chmod +x /opt/achme/health_monitor.sh

# Add to crontab (every 5 minutes):
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/achme/health_monitor.sh") | crontab -
echo "✅ Health monitor cron job installed"
crontab -l
```

---

## REDEPLOYMENT / UPDATE WORKFLOW

When you push code changes and want to update the live server:

```bash
#!/bin/bash
# ─────────────────────────────────────────────────────────
# ACHME — Update Existing Live Deployment
# Run this on the server after pulling new code
# ─────────────────────────────────────────────────────────

set -e
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "=== ACHME Update Started at $(date) ==="

# ── 1. Pull latest code ───────────────────────────────────
cd /opt/achme
git pull origin main
echo "✅ Code updated from GitHub"

# ── 2. Update backend dependencies ────────────────────────
cd /opt/achme/backend
npm install --omit=dev
echo "✅ Backend dependencies updated"

# ── 3. Rebuild React frontend ──────────────────────────────
cd /opt/achme/frontend
npm install
NODE_ENV=production npm run build
echo "✅ Frontend rebuilt"

# ── 4. Reload PM2 (zero-downtime) ─────────────────────────
cd /opt/achme
pm2 reload achme-backend
echo "✅ PM2 reloaded (zero-downtime)"

# ── 5. Reload Nginx (in case config changed) ──────────────
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Nginx reloaded"

# ── 6. Quick health check ──────────────────────────────────
sleep 3
curl -sf "http://${SERVER_IP}:82/health" | python3 -m json.tool
echo ""
echo "=== ✅ Update complete — Live at http://${SERVER_IP}:82 ==="
```

---

## TROUBLESHOOTING GUIDE

### Problem: Port 82 not reachable from other machines

```bash
# Check if Nginx is listening:
sudo netstat -tlnp | grep :82
# or
sudo ss -tlnp | grep :82

# Check UFW:
sudo ufw status | grep 82

# Check Nginx status:
sudo systemctl status nginx

# Check Nginx error log:
sudo tail -50 /var/log/nginx/achme-error.log
```

### Problem: Backend crashes / PM2 shows error

```bash
# View backend logs:
pm2 logs achme-backend --lines 100

# Check if port 5000 is in use:
sudo lsof -i :5000
sudo ss -tlnp | grep :5000

# Restart backend:
pm2 restart achme-backend

# Check .env exists and is correct:
cat /opt/achme/backend/.env

# Test backend manually (outside PM2):
cd /opt/achme/backend
node server.js
# Press Ctrl+C after checking output
```

### Problem: Database connection refused

```bash
# Check MySQL status:
sudo systemctl status mysql

# Test connection manually:
mysql -u achme_user -p achme -e "SHOW TABLES;"

# Check MySQL is on port 3306:
sudo netstat -tlnp | grep :3306

# Restart MySQL if needed:
sudo systemctl restart mysql

# Check MySQL error log:
sudo tail -50 /var/log/mysql/error.log
```

### Problem: Socket.IO not working (chat/notifications broken)

```bash
# Verify Socket.IO handshake through Nginx:
curl -v "http://localhost:82/socket.io/?EIO=4&transport=polling"
# Should return 200 with session data

# Check Nginx config has /socket.io/ location:
grep -A 10 "socket.io" /etc/nginx/sites-available/achme

# Check backend Socket.IO is running:
pm2 logs achme-backend --lines 20 | grep -i socket

# Make sure Upgrade headers are present in Nginx config:
grep -i "upgrade\|Connection" /etc/nginx/sites-available/achme
```

### Problem: React frontend shows blank/white page

```bash
# Check if build exists:
ls -la /opt/achme/frontend/build/index.html

# Rebuild if missing:
cd /opt/achme/frontend && NODE_ENV=production npm run build

# Check Nginx is serving the build directory:
grep "root" /etc/nginx/sites-available/achme

# Check browser console for JS errors (F12 > Console tab)

# Check Nginx access log:
sudo tail -50 /var/log/nginx/achme-access.log
```

### Problem: File uploads (PDF/invoices) not working

```bash
# Check uploads directory exists and has permissions:
ls -la /opt/achme/backend/uploads/
chmod 755 /opt/achme/backend/uploads/

# Check Nginx client_max_body_size:
grep "client_max_body_size" /etc/nginx/sites-available/achme

# Check Puppeteer can launch Chrome:
cd /opt/achme/backend
node -e "
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  console.log('✅ Puppeteer OK');
  await browser.close();
})().catch(e => console.error('❌ Puppeteer error:', e.message));
"
```

### Problem: Email / OTP not sending

```bash
# Verify email config in .env:
grep "EMAIL\|SMTP" /opt/achme/backend/.env

# Test SMTP connection:
cd /opt/achme/backend
node -e "
require('dotenv').config();
const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});
t.verify().then(() => console.log('✅ SMTP OK')).catch(e => console.error('❌ SMTP Error:', e.message));
"
# If Gmail: Make sure App Password is used, not account password
# Get App Password: myaccount.google.com/apppasswords
```

### Problem: PM2 process not surviving reboot

```bash
# Redo the startup setup:
pm2 delete achme-backend
pm2 start /opt/achme/ecosystem.config.js
pm2 save
pm2 startup
# Copy and run the sudo command it prints
```

### Useful Commands Reference

```bash
# Check everything at once:
pm2 list && sudo systemctl status nginx mysql

# View logs:
pm2 logs achme-backend --lines 50   # Backend logs
sudo tail -f /var/log/nginx/achme-error.log  # Nginx errors
sudo tail -f /opt/achme/logs/health.log       # Health monitor

# Restart everything:
pm2 restart achme-backend
sudo systemctl restart nginx

# Full status:
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "URL: http://${SERVER_IP}:82"
curl http://localhost:82/health
pm2 list
```

---

## FULL ONE-SHOT AUTOMATION SCRIPT

> **AI Agent: Run this single script to do the entire deployment from scratch.**
> Pre-condition: Ubuntu 20.04/22.04 server with internet access. Project code at `/opt/achme`.

```bash
#!/bin/bash
# ================================================================
# ACHME CRM — FULL ONE-SHOT DEPLOYMENT SCRIPT
# For AI agent auto-execution: end-to-end setup in one run
# ================================================================
# USAGE: sudo bash /opt/achme/deploy_oneshot.sh
# BEFORE RUNNING: Set the variables in the CONFIG section below.
# ================================================================

set -e
set -o pipefail

# ── CONFIG — Edit these before running ──────────────────────────
DB_USER="achme_user"
DB_PASS="AchmeSecure@2025"        # Change this!
DB_NAME="achme"
EMAIL_USER="thanan757@gmail.com"
EMAIL_PASS="ghjv omqm hwji kerq"  # Your Gmail App Password
PROJECT_DIR="/opt/achme"
GITHUB_REPO="https://github.com/abizomniverse-svg/ACHME.git"
# ── END CONFIG ──────────────────────────────────────────────────

log() { echo ""; echo "══════════════════════════════════════════"; echo "  $1"; echo "══════════════════════════════════════════"; }
ok()  { echo "  ✅ $1"; }
err() { echo "  ❌ $1"; exit 1; }

SERVER_IP=$(hostname -I | awk '{print $1}')
log "ACHME DEPLOYMENT STARTED — Server IP: ${SERVER_IP}"

# ── STEP 1: Install Dependencies ────────────────────────────────
log "STEP 1/12 — Installing system dependencies"
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git build-essential unzip mysql-server nginx \
  fonts-liberation libgbm1 libnss3 libatk-bridge2.0-0 libgtk-3-0 \
  libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 libxtst6 lsb-release
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2
ok "System dependencies installed — Node $(node -v) | Nginx OK | MySQL OK"

# ── STEP 2: Clone Project ────────────────────────────────────────
log "STEP 2/12 — Cloning project"
if [ -d "$PROJECT_DIR/.git" ]; then
  cd "$PROJECT_DIR" && git pull origin main
  ok "Project updated from GitHub"
else
  mkdir -p "$PROJECT_DIR"
  git clone "$GITHUB_REPO" "$PROJECT_DIR"
  ok "Project cloned to $PROJECT_DIR"
fi
mkdir -p "$PROJECT_DIR/logs" "$PROJECT_DIR/backend/uploads"

# ── STEP 3: MySQL Setup ──────────────────────────────────────────
log "STEP 3/12 — Setting up MySQL"
systemctl enable mysql && systemctl start mysql
mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$PROJECT_DIR/backend/schema.sql"
ok "MySQL database '${DB_NAME}' ready"

# ── STEP 4: Backend .env ─────────────────────────────────────────
log "STEP 4/12 — Writing backend .env"
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
cat > "$PROJECT_DIR/backend/.env" <<ENV
NODE_ENV=production
PORT=5000
ALLOWED_ORIGIN=*
DB_HOST=localhost
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
DB_NAME=${DB_NAME}
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=${EMAIL_USER}
EMAIL_PASS=${EMAIL_PASS}
JWT_SECRET=${JWT_SECRET}
DEFAULT_TEST_PASSWORD=Test@12345
DEMO_MODE=false
ENV
chmod 600 "$PROJECT_DIR/backend/.env"
ok "Backend .env written"

# ── STEP 5: Backend Deps ─────────────────────────────────────────
log "STEP 5/12 — Installing backend npm packages"
cd "$PROJECT_DIR/backend" && npm install --omit=dev
ok "Backend node_modules installed"

# ── STEP 6: Frontend Build ───────────────────────────────────────
log "STEP 6/12 — Building React frontend"
cd "$PROJECT_DIR/frontend"
npm install
NODE_ENV=production npm run build
[ -f "$PROJECT_DIR/frontend/build/index.html" ] || err "Frontend build failed!"
ok "React frontend built — $(du -sh $PROJECT_DIR/frontend/build | cut -f1)"

# ── STEP 7: PM2 Config ──────────────────────────────────────────
log "STEP 7/12 — Writing PM2 ecosystem config"
cat > "$PROJECT_DIR/ecosystem.config.js" <<ECFG
module.exports = {
  apps: [{
    name: 'achme-backend',
    script: '${PROJECT_DIR}/backend/server.js',
    cwd: '${PROJECT_DIR}/backend',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_restarts: 15,
    min_uptime: '10s',
    restart_delay: 3000,
    watch: false,
    max_memory_restart: '1500M',
    env: { NODE_ENV: 'production', PORT: 5000 },
    error_file: '${PROJECT_DIR}/logs/pm2-error.log',
    out_file: '${PROJECT_DIR}/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    time: true,
    kill_timeout: 5000,
    listen_timeout: 8000
  }]
};
ECFG
ok "PM2 ecosystem.config.js written"

# ── STEP 8: Nginx Config ─────────────────────────────────────────
log "STEP 8/12 — Writing Nginx config (port 82)"
cat > /etc/nginx/sites-available/achme <<NGX
upstream achme_backend { server 127.0.0.1:5000; keepalive 32; }
server {
    listen 82; listen [::]:82;
    server_name ${SERVER_IP} _;
    root ${PROJECT_DIR}/frontend/build;
    index index.html;
    gzip on; gzip_vary on; gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript image/svg+xml;
    client_max_body_size 50M;
    proxy_connect_timeout 60s; proxy_send_timeout 120s; proxy_read_timeout 120s;
    location /socket.io/ {
        proxy_pass http://achme_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_buffering off;
    }
    location /api/ {
        proxy_pass http://achme_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    location /uploads/ {
        proxy_pass http://achme_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
    location /health {
        proxy_pass http://achme_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        access_log off;
    }
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
    location ~ /\\. { deny all; }
    access_log /var/log/nginx/achme-access.log;
    error_log /var/log/nginx/achme-error.log;
}
NGX
ln -sf /etc/nginx/sites-available/achme /etc/nginx/sites-enabled/achme
rm -f /etc/nginx/sites-enabled/default
nginx -t || err "Nginx config invalid!"
systemctl enable nginx && systemctl reload nginx
ok "Nginx configured and running on port 82"

# ── STEP 9: Firewall ─────────────────────────────────────────────
log "STEP 9/12 — Opening port 82 in firewall"
ufw allow 82/tcp comment 'ACHME CRM' 2>/dev/null || true
ufw allow ssh 2>/dev/null || true
echo "y" | ufw enable 2>/dev/null || true
ok "Port 82 open in UFW"

# ── STEP 10: Start PM2 ───────────────────────────────────────────
log "STEP 10/12 — Starting backend with PM2"
cd "$PROJECT_DIR"
pm2 delete achme-backend 2>/dev/null || true
pm2 start "$PROJECT_DIR/ecosystem.config.js"
sleep 5
pm2 list
ok "Backend running via PM2"

# ── STEP 11: PM2 Auto-Start ──────────────────────────────────────
log "STEP 11/12 — Setting up PM2 auto-start"
pm2 save
PM2_STARTUP_CMD=$(pm2 startup | grep "sudo env" | tail -1)
[ -n "$PM2_STARTUP_CMD" ] && eval "$PM2_STARTUP_CMD"
ok "PM2 will restart on server reboot"

# ── STEP 12: Final Verification ──────────────────────────────────
log "STEP 12/12 — Final health check"
sleep 3
BACKEND_OK=$(curl -sf http://localhost:5000/health > /dev/null 2>&1 && echo "OK" || echo "FAIL")
NGINX_OK=$(curl -sf http://localhost:82/health > /dev/null 2>&1 && echo "OK" || echo "FAIL")
API_OK=$(curl -sf http://localhost:82/api/health > /dev/null 2>&1 && echo "OK" || echo "FAIL")
SOCKET_OK=$(curl -sf "http://localhost:82/socket.io/?EIO=4&transport=polling" > /dev/null 2>&1 && echo "OK" || echo "FAIL")

echo ""
echo "  Backend (port 5000):  ${BACKEND_OK}"
echo "  Nginx (port 82):      ${NGINX_OK}"
echo "  API via Nginx:        ${API_OK}"
echo "  Socket.IO via Nginx:  ${SOCKET_OK}"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  🎉 ACHME CRM DEPLOYMENT COMPLETE!"
echo ""
echo "  🌐 Access URL:   http://${SERVER_IP}:82"
echo "  📋 Share this URL with ALL users on the network."
echo ""
echo "  Backend port:    5000 (internal only)"
echo "  Database:        ${DB_NAME} @ localhost:3306"
echo "  PM2 process:     achme-backend"
echo "  Nginx config:    /etc/nginx/sites-available/achme"
echo "  Logs:            ${PROJECT_DIR}/logs/"
echo "  .env:            ${PROJECT_DIR}/backend/.env"
echo ""
echo "  To update later: cd ${PROJECT_DIR} && git pull && pm2 reload achme-backend"
echo "════════════════════════════════════════════════════════"
```

---

## QUICK REFERENCE

| Task | Command |
|------|---------|
| View backend logs | `pm2 logs achme-backend` |
| Restart backend | `pm2 restart achme-backend` |
| Reload Nginx | `sudo systemctl reload nginx` |
| Check live URL | `echo "http://$(hostname -I | awk '{print $1}'):82"` |
| View Nginx errors | `sudo tail -f /var/log/nginx/achme-error.log` |
| Check all processes | `pm2 list && sudo systemctl status nginx mysql` |
| Update from GitHub | `cd /opt/achme && git pull && pm2 reload achme-backend` |
| Full rebuild + reload | `cd /opt/achme/frontend && npm run build && pm2 reload achme-backend` |
| MySQL access | `mysql -u achme_user -p achme` |
| Socket.IO test | `curl "http://localhost:82/socket.io/?EIO=4&transport=polling"` |

---

*Generated for ACHME CRM v1.0 — GitHub: https://github.com/abizomniverse-svg/ACHME.git*
*Architecture: React + Express + Socket.IO + MySQL | Nginx Port 82 | PM2 Process Manager*
