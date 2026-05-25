# ACHME CRM — COMPLETE LIVE DEPLOYMENT GUIDE
## Nginx + PM2 + React Build + MySQL — Windows LAN + Local Domain

> **Hand this file to your AI and say: "Make ACHME live on this Windows machine."**
> Every step, every config, every file path, every line number is here.
> One-click launcher: `start_live_nginx_pm2.bat` (created alongside this file)

---

## TABLE OF CONTENTS

1. [Project Architecture Overview](#1-project-architecture-overview)
2. [What Gets Deployed Where](#2-what-gets-deployed-where)
3. [Port & Access Map](#3-port--access-map)
4. [Pre-requisites & Required Software](#4-pre-requisites--required-software)
5. [Step 1 — Install Node.js](#step-1--install-nodejs)
6. [Step 2 — Install MySQL 8](#step-2--install-mysql-8)
7. [Step 3 — Install PM2](#step-3--install-pm2)
8. [Step 4 — Install Nginx for Windows](#step-4--install-nginx-for-windows)
9. [Step 5 — Setup MySQL Database & User](#step-5--setup-mysql-database--user)
10. [Step 6 — Backend Configuration (.env)](#step-6--backend-configuration-env)
11. [Step 7 — Install Backend Dependencies](#step-7--install-backend-dependencies)
12. [Step 8 — Initialize Database Tables](#step-8--initialize-database-tables)
13. [Step 9 — Frontend Build Configuration](#step-9--frontend-build-configuration)
14. [Step 10 — Build React Frontend](#step-10--build-react-frontend)
15. [Step 11 — Configure Nginx](#step-11--configure-nginx)
16. [Step 12 — Start Backend with PM2](#step-12--start-backend-with-pm2)
17. [Step 13 — Start Nginx](#step-13--start-nginx)
18. [Step 14 — Windows Firewall Rules](#step-14--windows-firewall-rules)
19. [Step 15 — Map Local Domain (achme.com → LAN IP)](#step-15--map-local-domain-achmecom--lan-ip)
20. [Step 16 — Employee LAN Access Setup](#step-16--employee-lan-access-setup)
21. [Step 17 — Verify Everything is Working](#step-17--verify-everything-is-working)
22. [PM2 Cheat Sheet](#pm2-cheat-sheet)
23. [Nginx Windows Cheat Sheet](#nginx-windows-cheat-sheet)
24. [MySQL Troubleshooting](#mysql-troubleshooting)
25. [CORS & Socket.IO Troubleshooting](#cors--socketio-troubleshooting)
26. [Frontend API URL Logic Explained](#frontend-api-url-logic-explained)
27. [Common Errors & Fixes](#common-errors--fixes)
28. [Backup & Restore Database](#backup--restore-database)
29. [Updating & Redeploying](#updating--redeploying)
30. [Auto-Start on Windows Boot](#auto-start-on-windows-boot)
31. [Full File & Folder Reference](#full-file--folder-reference)
32. [Default Login Credentials](#default-login-credentials)

---

## 1. PROJECT ARCHITECTURE OVERVIEW

```
ACHME CRM — Production Stack on Windows LAN

  Employee Browser                Windows Host Machine
  ──────────────────              ────────────────────────────────────────
  http://achme.com    ───────→   hosts file: achme.com = 192.168.x.x
  http://192.168.x.x:82 ─────→  Nginx  (port 82)
                                  │
                                  ├── Static files: /frontend/build/*
                                  │    (React SPA, index.html fallback)
                                  │
                                  ├── /api/*  ──proxy──→  Node.js (port 5000)
                                  │                           │
                                  └── /socket.io/*  ─────→   PM2 manages
                                                              Node process
                                                              │
                                                              └── MySQL (port 3306)
                                                                  Database: achme
                                                                  User: achme_user
```

**Technology Stack:**
- **Frontend:** React 19 (CRA), built to static files
- **Backend:** Node.js + Express 5, Socket.IO, Puppeteer (PDF)
- **Database:** MySQL 8 with auto-migration on startup
- **Process Manager:** PM2 (keeps backend alive, auto-restart)
- **Web Server:** Nginx for Windows (serves static files, proxies API)
- **Access:** LAN WiFi — any browser, any device on same network

---

## 2. WHAT GETS DEPLOYED WHERE

| Component | Location on Disk | Port | Who Accesses |
|-----------|-----------------|------|-------------|
| Nginx | `C:\nginx\` | 82 | All LAN users |
| React Build | `C:\nginx\html\achme\` | via Nginx | All LAN users |
| Node.js Backend | `[project]\backend\` | 5000 (internal) | Nginx proxy only |
| MySQL | Windows Service | 3306 (local only) | Node.js backend only |
| PM2 | Global npm package | — | Manages Node process |

> **Why port 82 for Nginx?**
> Port 80 is often blocked by Windows services (IIS, Skype, Teams).
> Port 82 is free, works in all browsers without admin conflict.

---

## 3. PORT & ACCESS MAP

```
PORT 82   → Nginx (public — open to LAN)
              ↳ serves React build (all routes)
              ↳ /api/* proxied to :5000
              ↳ /socket.io/* proxied to :5000 (WebSocket)

PORT 5000  → Node.js backend (internal — NOT exposed to LAN directly)
              ↳ /api/auth
              ↳ /api/Telecalls
              ↳ /api/Walkins
              ↳ /api/quotations
              ↳ /api/task
              ↳ /api/client
              ↳ /api/invoice
              ↳ /api/payments
              ↳ /api/amc
              ↳ /api/contracts
              ↳ /api/chat
              ↳ /api/reports
              ↳ /api/notifications
              ↳ ... (all 30+ route groups)

PORT 3306  → MySQL (internal — NOT accessible from LAN)
```

**Employee browser URL:**
```
http://achme.com         ← after hosts file update on employee PC
http://192.168.x.x:82   ← works without any hosts file change
```

---

## 4. PRE-REQUISITES & REQUIRED SOFTWARE

| Software | Version | Required |
|----------|---------|----------|
| Windows 10/11 | any | ✅ Yes |
| Node.js | 20 LTS | ✅ Yes |
| npm | 10+ | included with Node |
| MySQL Server | 8.0+ | ✅ Yes |
| PM2 | latest | ✅ Yes |
| Nginx for Windows | 1.27.x | ✅ Yes |
| Chrome (Puppeteer) | auto-installed | for PDF generation |

**Your project is already set up — no Docker, no VPS needed.**
Everything runs locally on the Windows machine connected to your office WiFi.

---

## STEP 1 — INSTALL NODE.JS

### Check if already installed:
```cmd
node --version
npm --version
```

### If not installed:
```cmd
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
```
Or download from: https://nodejs.org/en/download (LTS version)

**After install, restart CMD and verify:**
```cmd
node --version
# Expected: v20.x.x or higher

npm --version
# Expected: 10.x.x or higher
```

---

## STEP 2 — INSTALL MYSQL 8

### Check if already installed:
```cmd
sc query MySQL80
# or
sc query MySQL
```

### Install via winget:
```cmd
winget install -e --id Oracle.MySQL --accept-package-agreements --accept-source-agreements
```

### Or download installer:
https://dev.mysql.com/downloads/mysql/

**During setup:**
- Root password: `admin@123` (or your own — note it down)
- Install as Windows Service: ✅ Yes
- Start on boot: ✅ Yes

### Verify MySQL is running:
```cmd
sc query MySQL80
# STATUS should be: RUNNING

# Test connection:
mysql -u root -padmin@123 -e "SELECT VERSION();"
```

---

## STEP 3 — INSTALL PM2

PM2 keeps your Node.js backend alive 24/7, restarts on crash, and can auto-start on Windows boot.

```cmd
npm install -g pm2
pm2 --version
```

**Expected output:** `5.x.x`

---

## STEP 4 — INSTALL NGINX FOR WINDOWS

### Download Nginx:
```
Go to: https://nginx.org/en/download.html
Download: nginx/Windows-1.27.x  (the .zip file)
Example filename: nginx-1.27.4.zip
```

### Extract to C:\nginx:
```cmd
# Using PowerShell:
Expand-Archive -Path "$env:USERPROFILE\Downloads\nginx-1.27.4.zip" -DestinationPath "C:\"
Rename-Item "C:\nginx-1.27.4" "C:\nginx"
```

### Verify:
```cmd
dir C:\nginx
# Should see: conf\  html\  logs\  nginx.exe  mime.types
```

### Add nginx to PATH (optional but useful):
```cmd
setx PATH "%PATH%;C:\nginx" /M
```

---

## STEP 5 — SETUP MYSQL DATABASE & USER

Run these commands in MySQL (as root):

```sql
-- Open MySQL CLI:
mysql -u root -padmin@123

-- Create the database:
CREATE DATABASE IF NOT EXISTS `achme`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create the application user:
CREATE USER IF NOT EXISTS 'achme_user'@'localhost' IDENTIFIED BY 'AchmeSecure@2024';
CREATE USER IF NOT EXISTS 'achme_user'@'127.0.0.1' IDENTIFIED BY 'AchmeSecure@2024';

-- Grant permissions:
GRANT ALL PRIVILEGES ON `achme`.* TO 'achme_user'@'localhost';
GRANT ALL PRIVILEGES ON `achme`.* TO 'achme_user'@'127.0.0.1';
FLUSH PRIVILEGES;

-- Verify:
SELECT User, Host FROM mysql.user WHERE User = 'achme_user';

-- Exit:
EXIT;
```

> **Note:** The `ensure_db_user.js` script in `backend/` does this automatically.
> It tries root password `admin@123` and blank `""` automatically.
> Just run: `node backend/ensure_db_user.js`

---

## STEP 6 — BACKEND CONFIGURATION (.env)

**File location:** `backend/.env`

**Create/overwrite this file with the correct content:**

```env
# ================================================
# ACHME CRM Backend — Production .env
# File: [project-root]/backend/.env
# ================================================

# Server
PORT=5000
NODE_ENV=production

# CORS — add your LAN IP here (auto-done by start_live_nginx_pm2.bat)
# Format: comma-separated, no spaces
ALLOWED_ORIGIN=http://localhost:82,http://192.168.1.X:82,http://achme.com,http://www.achme.com

# Database — uses achme_user (never root in production)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=achme_user
DB_PASS=AchmeSecure@2024
DB_NAME=achme

# Email (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=thanan757@gmail.com
EMAIL_PASS=ghjv omqm hwji kerq

# JWT — keep this secret, never share
JWT_SECRET=97418d0c15d57ade768586b8501e35d34e5a5277f2a0570b6d5b47ef93f5b33e88b80045c60efd77e6edcbb015dbe46cf6747ce1dd8f11361f3e426ddc677c9a

# Default test password (for seeded employees)
DEFAULT_TEST_PASSWORD=Test@12345
```

> **Important CORS note:**
> Replace `192.168.1.X` with your actual LAN IP (detected automatically by start_live_nginx_pm2.bat).
> The `ALLOWED_ORIGIN` must exactly match the URL employees use in their browser.

---

## STEP 7 — INSTALL BACKEND DEPENDENCIES

```cmd
cd [project-root]\backend
npm install

# Install Puppeteer's Chrome browser (required for PDF invoice generation):
npx puppeteer browsers install chrome

# Expected output includes:
# ✔  chrome@stable
```

**Key dependencies being installed:**
- `express` — HTTP server
- `mysql2` — MySQL driver with auto-migration
- `socket.io` — real-time notifications and chat
- `jsonwebtoken` — auth tokens
- `bcryptjs` — password hashing
- `nodemailer` — email (OTP, invoice delivery)
- `puppeteer` — PDF generation for invoices/quotations
- `node-schedule` — reminder scheduler
- `multer` — file uploads
- `cors`, `dotenv`, `axios`

---

## STEP 8 — INITIALIZE DATABASE TABLES

The backend auto-creates all 40+ tables on first start, but you can also pre-initialize:

```cmd
cd [project-root]\backend

# Step 1: Ensure DB user exists:
node ensure_db_user.js

# Step 2: Initialize all tables + seed default users:
node db_init.js
```

**What `db_init.js` does:**
- Connects to MySQL using `achme_user`
- Creates database `achme` if not exists
- Runs `schema.sql`
- Runs `ensureTablesAndColumns()` — creates all 40+ tables
- Seeds default admin + 6 employee accounts

**Default seeded accounts after db_init:**

| Role | Email | Password |
|------|-------|----------|
| Admin | `Kk@achmecommunication.com` | `kk@admin@123` |
| Employee | `info@achmecommunication.com` | `Achme@Princee` |
| Employee | `sales1@technostore.co.in` | `Achme@Vimal` |
| Employee | `sales5@technostore.co.in` | `Achme@Moorthi` |
| Employee | `uma@achmecommunication.com` | `Achme@Uma` |
| Employee | `nagaraj@technostore.co.in` | `Achme@Nagaraj` |
| Employee | `service@achmecommunication.com` | `Achme@Priyanka` |

---

## STEP 9 — FRONTEND BUILD CONFIGURATION

The frontend uses a smart API URL detection logic in `frontend/src/config.js`:

```javascript
// frontend/src/config.js (LINE 1-10) — DO NOT MODIFY THIS FILE
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (window.location.port && window.location.port !== "3000") {
    return window.location.origin;   // ← This is used in production via Nginx
  }
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:5000`;
};
```

**In production (via Nginx on port 82):**
- `window.location.origin` = `http://192.168.x.x:82` or `http://achme.com`
- So API calls go to `http://192.168.x.x:82/api/...`
- Nginx proxies `/api/...` → Node.js `:5000`
- **No hardcoded IP needed in the frontend build!** ✅

**Create `frontend/.env.production`:**
```env
# File: [project-root]/frontend/.env.production
# Leave REACT_APP_API_URL blank — config.js auto-detects from window.location
REACT_APP_API_URL=
REACT_APP_API_PROXY=
```

> This is the key insight: when deployed via Nginx, the frontend auto-detects
> the correct API URL from the browser's address bar. No rebuild needed when IP changes.

---

## STEP 10 — BUILD REACT FRONTEND

```cmd
cd [project-root]\frontend
npm install
npm run build
```

**Expected output:**
```
Creating an optimized production build...
Compiled successfully.

File sizes after gzip:
  xxx kB  build/static/js/main.xxxxxxxx.js
  xxx kB  build/static/css/main.xxxxxxxx.css

The build folder is ready to be deployed.
```

**Build output location:** `[project-root]\frontend\build\`

This folder contains:
- `index.html` — main entry point
- `static/js/` — bundled JavaScript
- `static/css/` — bundled CSS
- `static/media/` — images, fonts
- `manifest.json`, `robots.txt`

---

## STEP 11 — CONFIGURE NGINX

### 11a. Create the frontend build directory for Nginx:

```cmd
mkdir C:\nginx\html\achme
```

### 11b. Copy React build to Nginx:

```cmd
xcopy /E /I /Y "[project-root]\frontend\build\*" "C:\nginx\html\achme\"
```

### 11c. Write the Nginx config:

**Edit file:** `C:\nginx\conf\nginx.conf`

Replace the ENTIRE content with:

```nginx
# ================================================
# ACHME CRM — Nginx Production Config
# File: C:\nginx\conf\nginx.conf
# ================================================

worker_processes 1;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout 65;

    # ── Logging ────────────────────────────────────────────────────────
    access_log  logs/achme_access.log;
    error_log   logs/achme_error.log;

    # ── Upstream: Node.js backend ───────────────────────────────────────
    upstream achme_backend {
        server 127.0.0.1:5000;
        keepalive 32;
    }

    # ── Main Server Block: port 82 ──────────────────────────────────────
    server {
        listen 82;
        server_name achme.com www.achme.com _;

        # ── Root: Serve React SPA ──────────────────────────────────────
        root C:/nginx/html/achme;
        index index.html;

        # React Router fallback — all unknown paths return index.html
        location / {
            try_files $uri $uri/ /index.html;
        }

        # ── API Proxy → Node.js :5000 ──────────────────────────────────
        location /api/ {
            proxy_pass http://achme_backend;
            proxy_http_version 1.1;

            proxy_set_header Host              $host;
            proxy_set_header X-Real-IP         $remote_addr;
            proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts (PDF generation can take time)
            proxy_connect_timeout  120s;
            proxy_send_timeout     120s;
            proxy_read_timeout     120s;

            # Body size for file uploads (multer)
            client_max_body_size 50M;
        }

        # ── Socket.IO Proxy (real-time notifications & chat) ──────────
        location /socket.io/ {
            proxy_pass http://achme_backend;
            proxy_http_version 1.1;

            # WebSocket upgrade headers — REQUIRED for Socket.IO
            proxy_set_header Upgrade    $http_upgrade;
            proxy_set_header Connection "upgrade";

            proxy_set_header Host              $host;
            proxy_set_header X-Real-IP         $remote_addr;
            proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;

            proxy_connect_timeout 60s;
            proxy_send_timeout    60s;
            proxy_read_timeout    3600s;   # Keep WS alive 1 hour
        }

        # ── Static asset caching ────────────────────────────────────────
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        # ── Health check ────────────────────────────────────────────────
        location /nginx-health {
            return 200 "Nginx OK\n";
            add_header Content-Type text/plain;
        }

        # ── Security: block hidden files ────────────────────────────────
        location ~ /\. {
            deny all;
        }
    }

    # ── Port 80: Redirect to port 82 ────────────────────────────────────
    # Allows http://achme.com (no port) to redirect to http://achme.com:82
    server {
        listen 80;
        server_name achme.com www.achme.com;

        return 301 http://$host:82$request_uri;
    }
}
```

> **Key configurations explained:**
> - Line `listen 82;` — Nginx listens on port 82 (change here if you want 80/8080)
> - Line `root C:/nginx/html/achme;` — where React build files are served from
> - `location /api/` — all API requests proxy to Node.js on port 5000
> - `location /socket.io/` — WebSocket proxy for real-time features (chat, notifications)
> - `proxy_read_timeout 120s` — needed for Puppeteer PDF generation (can take 30-60s)
> - `client_max_body_size 50M` — allows large file uploads via multer

### 11d. Validate Nginx config:

```cmd
cd C:\nginx
nginx.exe -t

# Expected output:
# nginx: the configuration file C:\nginx/conf/nginx.conf syntax is ok
# nginx: configuration file C:\nginx/conf/nginx.conf test is successful
```

---

## STEP 12 — START BACKEND WITH PM2

### 12a. Create PM2 ecosystem file:

**File:** `[project-root]\backend\ecosystem.production.config.js`

```javascript
// ================================================
// ACHME CRM — PM2 Ecosystem Config (Production)
// File: [project-root]/backend/ecosystem.production.config.js
// ================================================

module.exports = {
  apps: [
    {
      name: "achme-backend",

      // Path to server entry point
      script: "./server.js",

      // Working directory
      cwd: __dirname,

      // Use single instance in production (use 'max' for multi-core)
      instances: 1,
      exec_mode: "fork",

      // Auto-restart settings
      autorestart: true,
      max_restarts: 10,
      min_uptime: "5s",
      restart_delay: 3000,

      // Do not watch files (production)
      watch: false,

      // Restart if memory exceeds 1GB
      max_memory_restart: "1G",

      // Environment variables (production)
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },

      // Log files
      error_file: "../logs/pm2-error.log",
      out_file:   "../logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,

      // Time in logs
      time: true
    }
  ]
};
```

### 12b. Create logs directory:

```cmd
mkdir [project-root]\logs
```

### 12c. Start with PM2:

```cmd
cd [project-root]\backend
pm2 start ecosystem.production.config.js

# Check status:
pm2 status

# Expected output:
# ┌────┬─────────────────┬───────────┬──────┬───────────┬──────────┬──────────┐
# │ id │ name            │ namespace │ mode │ pid       │ uptime   │ status   │
# ├────┼─────────────────┼───────────┼──────┼───────────┼──────────┼──────────┤
# │ 0  │ achme-backend   │ default   │ fork │ XXXX      │ 0s       │ online   │
# └────┴─────────────────┴───────────┴──────┴───────────┴──────────┴──────────┘
```

### 12d. Verify backend is running:

```cmd
curl http://localhost:5000/api/health
# or open in browser: http://localhost:5000/api/health

# Expected JSON response:
# {"ok":true,"database":"ready","uptime":X,"timestamp":"..."}
```

### 12e. View live logs:

```cmd
pm2 logs achme-backend
pm2 logs achme-backend --lines 50
```

---

## STEP 13 — START NGINX

### 13a. Stop any existing Nginx:

```cmd
taskkill /f /im nginx.exe 2>nul
```

### 13b. Start Nginx:

```cmd
cd C:\nginx
start nginx.exe
```

### 13c. Verify Nginx is running:

```cmd
tasklist /fi "imagename eq nginx.exe"
# Should show nginx.exe processes

# Test via browser or curl:
curl http://localhost:82
# Should return the React app HTML
```

### 13d. Test the full stack:

```cmd
# Frontend:
curl http://localhost:82
# Expected: HTML page starting with <!doctype html>

# API via Nginx:
curl http://localhost:82/api/health
# Expected: {"ok":true,"database":"ready",...}

# Nginx health:
curl http://localhost:82/nginx-health
# Expected: Nginx OK
```

---

## STEP 14 — WINDOWS FIREWALL RULES

Open the firewall so LAN devices (employee PCs, phones, tablets) can access the app:

```cmd
# Open port 82 for frontend/API access (LAN)
netsh advfirewall firewall add rule ^
  name="ACHME CRM Nginx Port 82" ^
  dir=in action=allow ^
  protocol=TCP localport=82

# Optional: open port 80 for redirect
netsh advfirewall firewall add rule ^
  name="ACHME CRM Port 80 Redirect" ^
  dir=in action=allow ^
  protocol=TCP localport=80

# DO NOT expose port 5000 or 3306 to LAN
# Node and MySQL are internal only
```

**Verify rules exist:**
```cmd
netsh advfirewall firewall show rule name="ACHME CRM Nginx Port 82"
```

---

## STEP 15 — MAP LOCAL DOMAIN (achme.com → LAN IP)

This lets employees type `http://achme.com` instead of `http://192.168.x.x:82`.

### Find your LAN IP:

```cmd
# PowerShell:
(Find-NetRoute -RemoteIPAddress '8.8.8.8').LocalIPAddress
# or
ipconfig | findstr /i "IPv4"
# Example result: 192.168.1.105
```

### Update the hosts file on the SERVER MACHINE:

**File location:** `C:\Windows\System32\drivers\etc\hosts`

Open Notepad as Administrator, then add at the bottom:

```
# ACHME CRM Local Domain
192.168.1.105    achme.com    www.achme.com
```

> Replace `192.168.1.105` with your actual LAN IP.

**One-liner via PowerShell (run as Administrator):**
```powershell
$lanIP = (Find-NetRoute -RemoteIPAddress '8.8.8.8').LocalIPAddress
$hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"
$line = "$lanIP    achme.com    www.achme.com"
$content = Get-Content $hostsFile
$filtered = $content | Where-Object { $_ -notmatch '\bachme\.com\b' }
$filtered + $line | Set-Content $hostsFile -Force
Write-Host "Mapped: achme.com → $lanIP"
```

---

## STEP 16 — EMPLOYEE LAN ACCESS SETUP

Employees need to do ONE of the following to use `http://achme.com`:

### Option A: Update hosts file on each employee PC (recommended)

On each employee's Windows PC, open Notepad as Administrator:
Edit: `C:\Windows\System32\drivers\etc\hosts`
Add:
```
192.168.1.105    achme.com    www.achme.com
```

For Android/iOS: use a DNS app (DNS66, AdGuard, etc.) or just use the IP:PORT directly.

### Option B: Use IP:PORT directly (no setup needed)

Employees simply type:
```
http://192.168.1.105:82
```
This works on any browser, any device, on the same WiFi — no configuration needed.

### Option C: Set up a local DNS server (advanced)

If you have a router that supports custom DNS entries, add:
```
achme.com → 192.168.1.105
```
Then every device on the WiFi resolves `achme.com` without editing hosts files.

**Check access on employee device:**
```
Open browser → http://192.168.1.105:82
Should show: ACHME CRM login page
```

---

## STEP 17 — VERIFY EVERYTHING IS WORKING

Run these checks in order:

```cmd
# ① MySQL running?
sc query MySQL80 | findstr STATE
# Expected: STATE : 4  RUNNING

# ② Backend running?
curl http://localhost:5000/api/health
# Expected: {"ok":true,"database":"ready",...}

# ③ PM2 status?
pm2 status
# Expected: achme-backend   online

# ④ Nginx running?
tasklist /fi "imagename eq nginx.exe" | findstr nginx.exe
# Expected: nginx.exe   XXXX Console   0  ...K

# ⑤ Frontend via Nginx?
curl http://localhost:82
# Expected: HTML with React app

# ⑥ API via Nginx?
curl http://localhost:82/api/health
# Expected: {"ok":true,...}

# ⑦ Socket.IO via Nginx?
curl http://localhost:82/socket.io/?EIO=4&transport=polling
# Expected: 0{"sid":"...","upgrades":["websocket"],...}

# ⑧ From another device on LAN?
# Open http://192.168.1.105:82 on employee phone/laptop
# Expected: ACHME CRM login page loads

# ⑨ Login works?
# Email: Kk@achmecommunication.com
# Password: kk@admin@123
```

---

## PM2 CHEAT SHEET

```cmd
# Start using ecosystem config:
pm2 start ecosystem.production.config.js

# List all apps:
pm2 list
pm2 status

# View live logs:
pm2 logs achme-backend
pm2 logs achme-backend --lines 100

# Restart app:
pm2 restart achme-backend

# Stop app:
pm2 stop achme-backend

# Delete app:
pm2 delete achme-backend

# Monitor CPU/RAM:
pm2 monit

# Save current process list (for auto-start):
pm2 save

# Setup auto-start on Windows boot:
pm2 startup
# Run the command it outputs

# Show app info:
pm2 show achme-backend

# Reload without downtime:
pm2 reload achme-backend
```

---

## NGINX WINDOWS CHEAT SHEET

```cmd
# Start:
cd C:\nginx
start nginx.exe

# Stop (graceful):
cd C:\nginx
nginx.exe -s stop

# Reload config without restart:
cd C:\nginx
nginx.exe -s reload

# Test config:
cd C:\nginx
nginx.exe -t

# Force stop:
taskkill /f /im nginx.exe

# View error log:
type C:\nginx\logs\achme_error.log

# View access log:
type C:\nginx\logs\achme_access.log
```

---

## MYSQL TROUBLESHOOTING

### Can't connect to MySQL:
```cmd
# Start MySQL service:
net start MySQL80
# or:
net start MySQL

# Test connection:
mysql -u root -padmin@123 -e "SELECT 1"
mysql -u achme_user -pAchmeSecure@2024 -e "SELECT 1"
```

### Reset achme_user password:
```sql
mysql -u root -padmin@123
ALTER USER 'achme_user'@'localhost' IDENTIFIED BY 'AchmeSecure@2024';
ALTER USER 'achme_user'@'127.0.0.1' IDENTIFIED BY 'AchmeSecure@2024';
FLUSH PRIVILEGES;
EXIT;
```

### Check all tables exist:
```sql
mysql -u achme_user -pAchmeSecure@2024 achme
SHOW TABLES;
# Should show 40+ tables
```

### Re-run migrations:
```cmd
cd [project-root]\backend
node db_init.js
# This is safe to run multiple times — it's idempotent
```

---

## CORS & SOCKET.IO TROUBLESHOOTING

### CORS error in browser console:
**Symptom:** `Access to XMLHttpRequest blocked by CORS policy`

**Fix:** Update `ALLOWED_ORIGIN` in `backend/.env`:
```env
ALLOWED_ORIGIN=http://localhost:82,http://192.168.1.105:82,http://achme.com,http://www.achme.com
```
Then restart PM2: `pm2 restart achme-backend`

### Socket.IO not connecting:
**Check:** Is `/socket.io/` location block in nginx.conf correct?
**Verify:** The `Upgrade` and `Connection` headers are set in nginx.conf
**Test:**
```cmd
curl http://localhost:82/socket.io/?EIO=4&transport=polling
```
Should return a Socket.IO handshake response.

### Socket.IO in browser shows polling, not WebSocket:
This is normal. Socket.IO starts with long-polling then upgrades to WebSocket.
The nginx.conf proxy_read_timeout of 3600s for /socket.io/ keeps the connection alive.

---

## FRONTEND API URL LOGIC EXPLAINED

**File:** `frontend/src/config.js` (Lines 1-10)

```javascript
const getApiUrl = () => {
  // 1. If REACT_APP_API_URL env var is set, use it
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;

  // 2. If browser port is not 3000 (i.e., production via Nginx port 82)
  //    use the SAME origin as the browser (http://192.168.x.x:82)
  //    This way /api/... calls go to Nginx which proxies to Node:5000
  if (window.location.port && window.location.port !== "3000") {
    return window.location.origin;
  }

  // 3. Development fallback — browser on port 3000, backend on 5000
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:5000`;
};
```

**Result in production (via Nginx :82):**
- Browser opens `http://192.168.1.105:82`
- `window.location.origin` = `http://192.168.1.105:82`
- API calls go to `http://192.168.1.105:82/api/...`
- Nginx proxies to Node:5000 ✅

**This means the build works for any IP automatically — no hardcoding required.**

---

## COMMON ERRORS & FIXES

### Error: "Port 82 is already in use"
```cmd
# Find what is using port 82:
netstat -ano | findstr :82

# Kill that process (replace XXXX with PID):
taskkill /f /pid XXXX
```

### Error: "Port 5000 is already in use"
```cmd
netstat -ano | findstr :5000
taskkill /f /pid XXXX
```

### Error: "ECONNREFUSED connecting to MySQL"
```cmd
# MySQL not running — start it:
net start MySQL80
# Verify in .env: DB_HOST=127.0.0.1, DB_PORT=3306
```

### Error: "React build not found" on backend start
The backend also serves the React build directly (at `../frontend/build`).
If you see this, make sure `npm run build` succeeded in the frontend folder.
```cmd
ls [project-root]\frontend\build\index.html
```

### Error: "Cannot find module" in backend
```cmd
cd [project-root]\backend
npm install
```

### Nginx 502 Bad Gateway
Node.js backend is not running. Check:
```cmd
pm2 status
pm2 logs achme-backend
curl http://localhost:5000/api/health
```

### Nginx 404 on page refresh
The React app uses client-side routing. Nginx must serve `index.html` for all routes.
Make sure `try_files $uri $uri/ /index.html;` is in the `location /` block.

### PDF generation fails
Puppeteer Chrome not installed. Run:
```cmd
cd [project-root]\backend
npx puppeteer browsers install chrome
```

---

## BACKUP & RESTORE DATABASE

### Backup:
```cmd
mysqldump -u achme_user -pAchmeSecure@2024 achme > achme_backup_%DATE:~-4,4%%DATE:~-7,2%%DATE:~-10,2%.sql
```

### Restore:
```cmd
mysql -u achme_user -pAchmeSecure@2024 achme < achme_backup_YYYYMMDD.sql
```

### Automated daily backup (Task Scheduler):
Create `backup_db.bat`:
```bat
@echo off
set BACKUP_DIR=C:\Deployment\achme\backups
set DATE_STR=%DATE:~-4,4%%DATE:~-7,2%%DATE:~-10,2%
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
mysqldump -u achme_user -pAchmeSecure@2024 achme > "%BACKUP_DIR%\achme_%DATE_STR%.sql"
echo Backup done: achme_%DATE_STR%.sql
```

---

## UPDATING & REDEPLOYING

When you push new code changes:

```cmd
# 1. Pull latest code (or copy new files):
cd [project-root]
git pull

# 2. Update backend dependencies:
cd backend
npm install

# 3. Restart backend (zero-downtime):
pm2 restart achme-backend

# 4. Rebuild frontend:
cd ..\frontend
npm install
npm run build

# 5. Copy new build to Nginx:
xcopy /E /I /Y "build\*" "C:\nginx\html\achme\"

# 6. Reload Nginx (no restart needed):
cd C:\nginx
nginx.exe -s reload

# Done! No server restart needed.
```

---

## AUTO-START ON WINDOWS BOOT

### PM2 auto-start:

```cmd
# Save current PM2 process list:
pm2 save

# Install PM2 startup (follow the printed instructions):
pm2 startup

# This creates a Windows scheduled task that starts PM2 on login.
```

### Nginx auto-start (Windows Service):

Use NSSM (Non-Sucking Service Manager) to run Nginx as a service:

```cmd
# Download NSSM: https://nssm.cc/download
# Install Nginx as service:
nssm install NGINX_ACHME C:\nginx\nginx.exe

# Start the service:
nssm start NGINX_ACHME

# Now Nginx starts automatically on Windows boot
# and restarts if it crashes.
```

**Or simple approach — add to Windows Startup:**
```cmd
# Create a shortcut in startup folder:
shell:startup
# Add a shortcut to start_nginx.bat which does:
# cd C:\nginx && start nginx.exe
```

---

## FULL FILE & FOLDER REFERENCE

```
[project-root]/
├── backend/
│   ├── .env                          ← EDIT THIS: DB credentials, CORS origins
│   ├── .env.example                  ← Template for .env
│   ├── server.js                     ← Main entry point (PORT from .env)
│   ├── config/
│   │   └── database.js               ← MySQL connection + auto-migration
│   ├── routes/                       ← 30+ API route files
│   │   ├── authRoutes.js             ← /api/auth (login, register, approve)
│   │   ├── telecallRoutes.js         ← /api/Telecalls
│   │   ├── walkinRoutes.js           ← /api/Walkins
│   │   ├── fieldRoutes.js            ← /api/Fields
│   │   ├── quotationRoutes.js        ← /api/quotations
│   │   ├── invoice.js                ← /api/invoice
│   │   ├── amcRoutes.js              ← /api/amc
│   │   ├── callReportRoutes.js       ← /api/call-reports
│   │   ├── chatroutes.js             ← /api/chat
│   │   ├── notificationRoutes.js     ← /api/notifications
│   │   └── ... (20+ more)
│   ├── sockets/
│   │   ├── chatsockets.js            ← Socket.IO: chat namespace
│   │   └── notifications.js          ← Socket.IO: /notifications namespace
│   ├── backendutil/
│   │   ├── reminderScheduler.js      ← Auto-reminder cron jobs
│   │   ├── generateInvoicePdf.js     ← Puppeteer PDF generator
│   │   ├── generateEmailHtml.js      ← Email HTML templates
│   │   └── sendSms.js                ← Twilio SMS (optional)
│   ├── ensure_db_user.js             ← Creates achme_user in MySQL
│   ├── db_init.js                    ← Initializes DB tables
│   ├── ecosystem.production.config.js ← PM2 config (created in Step 12a)
│   └── schema.sql                    ← Base schema
│
├── frontend/
│   ├── .env.production               ← Keep REACT_APP_API_URL blank
│   ├── src/
│   │   ├── config.js                 ← Auto-detects API URL (DO NOT MODIFY)
│   │   ├── config/
│   │   │   ├── api.js                ← Re-exports config.js
│   │   │   └── axios.js              ← Axios instance with auth headers
│   │   ├── socket/
│   │   │   └── socket.js             ← Socket.IO client connections
│   │   ├── pages/                    ← All 25+ page components
│   │   ├── dashboards/               ← Admin + User dashboards
│   │   ├── sidebars/                 ← Admin + User sidebars
│   │   └── components/               ← Shared components
│   └── build/                        ← Created by npm run build
│
├── C:\nginx\                          ← Nginx installation
│   ├── conf\nginx.conf               ← EDIT THIS (Step 11c)
│   ├── html\achme\                   ← React build files go here
│   └── logs\                         ← achme_access.log, achme_error.log
│
├── logs/                             ← PM2 log files
│   ├── pm2-out.log
│   └── pm2-error.log
│
├── start_live_nginx_pm2.bat          ← ONE-CLICK LAUNCHER ← USE THIS
├── start-servers.bat                 ← Development mode (not for LAN)
└── start_live.bat                    ← Old launcher (no Nginx/PM2)
```

---

## DEFAULT LOGIN CREDENTIALS

| Account Type | Email | Password |
|---|---|---|
| **Admin** | `Kk@achmecommunication.com` | `kk@admin@123` |
| Employee | `info@achmecommunication.com` | `Achme@Princee` |
| Employee | `sales1@technostore.co.in` | `Achme@Vimal` |
| Employee | `sales5@technostore.co.in` | `Achme@Moorthi` |
| Employee | `uma@achmecommunication.com` | `Achme@Uma` |
| Employee | `nagaraj@technostore.co.in` | `Achme@Nagaraj` |
| Employee | `service@achmecommunication.com` | `Achme@Priyanka` |

> **Note:** Employee passwords can be changed after first login.
> Admin password should be changed in production via the profile page.

---

## AFTER DEPLOYMENT — ACCESS SUMMARY

Once `start_live_nginx_pm2.bat` completes, your ACHME CRM is live:

```
╔══════════════════════════════════════════════════════════════════╗
║              ACHME CRM IS LIVE — ACCESS DETAILS                 ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  From THIS machine:                                              ║
║    http://localhost:82              ← works immediately          ║
║    http://achme.com                ← after hosts file update     ║
║                                                                  ║
║  From LAN devices (employees):                                   ║
║    http://192.168.X.X:82           ← works on any browser/device ║
║    http://achme.com                ← after hosts update on PC    ║
║                                                                  ║
║  Backend health check:                                           ║
║    http://192.168.X.X:82/api/health                              ║
║                                                                  ║
║  Login:                                                          ║
║    Admin: Kk@achmecommunication.com / kk@admin@123               ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

*This guide covers the complete deployment of ACHME CRM — reading this end to end and following each step will result in a fully working, LAN-accessible, production-grade deployment.*
*Version: ACHME CRM — Generated from source code analysis*
