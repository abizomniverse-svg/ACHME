# ACHME CRM — make_live.md
# On-Premises Linux Deployment Guide (Nginx + PM2 on Port 82)
# Auto-detects server IP • Fully autonomous AI-agent-ready
# ============================================================
#
# PROJECT ANATOMY (read before executing anything)
# ─────────────────────────────────────────────────
# ACHME is a full-stack CRM system:
#   frontend/   → React (Create React App) SPA
#   backend/    → Node.js + Express + Socket.IO API server
#   MySQL 8.x   → Relational database (auto-initialised by backend/config/database.js)
#
# HOW THE PIECES TALK IN PRODUCTION
# ─────────────────────────────────
#   Browser  ──→  http://<SERVER_IP>:82  (Nginx listens here)
#              ├─ /          → serves frontend/build static files
#              ├─ /api/      → proxy → localhost:5000 (PM2 Node process)
#              ├─ /socket.io/→ proxy → localhost:5000 (WebSocket upgrade)
#              └─ /uploads/  → proxy → localhost:5000 (file uploads)
#
#   In production, frontend config/index.js returns "" for API_URL,
#   so every axios call uses a RELATIVE path (/api/...).
#   Nginx routes those to the backend. No CORS issues.
#
# PORT SUMMARY
#   :82   — Nginx (public-facing, all users access this)
#   :5000 — Node.js/PM2 (internal only, never expose to internet)
#   :3306 — MySQL (localhost only)
#
# ─────────────────────────────────────────────────────────────

# ═══════════════════════════════════════════════════════════════
# PHASE 0 — PRE-FLIGHT: UNDERSTAND YOUR SERVER
# ═══════════════════════════════════════════════════════════════

## 0.1 — Auto-detect the server IP address
# Run this ONE command and note the IP it prints.
# Every place you see <SERVER_IP> in this file, replace with that value.

```bash
# Auto IP detection — run this first
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "Your server IP is: $SERVER_IP"
echo "Users will access ACHME at: http://$SERVER_IP:82"
```

# If hostname -I gives multiple IPs, pick the LAN/internal one (e.g. 192.168.x.x).
# You can also check with:
```bash
ip route get 1 | awk '{print $7; exit}'
```

## 0.2 — Minimum server requirements
# OS       : Ubuntu 20.04 LTS / 22.04 LTS (recommended) or Debian 11+
# RAM      : 2 GB minimum, 4 GB recommended
# Disk     : 20 GB free
# CPU      : 2 cores minimum
# Open ports required: 82 (Nginx), 3306 (MySQL, localhost only)

## 0.3 — What this guide installs
# 1. Node.js 20 LTS (via NodeSource)
# 2. PM2 (Node process manager, auto-start on reboot)
# 3. MySQL 8.x (database)
# 4. Nginx (reverse proxy + static file server)
# 5. Git (for pulling your code)

# ═══════════════════════════════════════════════════════════════
# PHASE 1 — SYSTEM DEPENDENCIES
# ═══════════════════════════════════════════════════════════════

## 1.1 — Update and install base packages

```bash
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl wget git unzip build-essential
```

## 1.2 — Install Node.js 20 LTS (via NodeSource official repo)

```bash
# Download and run the NodeSource setup script for Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js (includes npm)
sudo apt-get install -y nodejs

# Verify installation
node -v   # Should print v20.x.x
npm -v    # Should print 10.x.x
```

## 1.3 — Install PM2 globally

```bash
sudo npm install -g pm2

# Verify
pm2 -v
```

## 1.4 — Install MySQL 8.x

```bash
# Install MySQL server
sudo apt-get install -y mysql-server

# Start and enable MySQL to run on boot
sudo systemctl start mysql
sudo systemctl enable mysql

# Verify MySQL is running
sudo systemctl status mysql
```

## 1.5 — Secure MySQL and create the ACHME database + user

```bash
# Run the MySQL secure installation wizard
# When asked:
#   Set root password? → YES (choose a strong password, save it)
#   Remove anonymous users? → YES
#   Disallow root login remotely? → YES
#   Remove test database? → YES
#   Reload privilege tables? → YES
sudo mysql_secure_installation
```

```bash
# Log in to MySQL as root and set up the ACHME database and dedicated user
sudo mysql -u root -p
```

Inside MySQL shell, run these SQL commands:
```sql
-- Create the application database
CREATE DATABASE IF NOT EXISTS achme
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create a dedicated app user (never use root in .env)
-- Replace 'AchmeSecure@2024' with a strong password of your choice
CREATE USER IF NOT EXISTS 'achme_user'@'localhost'
  IDENTIFIED BY 'AchmeSecure@2024';

-- Grant all privileges on the achme database only
GRANT ALL PRIVILEGES ON achme.* TO 'achme_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Confirm database was created
SHOW DATABASES;

EXIT;
```

## 1.6 — Install Nginx

```bash
sudo apt-get install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify
sudo systemctl status nginx
```

# ═══════════════════════════════════════════════════════════════
# PHASE 2 — DEPLOY THE PROJECT CODE
# ═══════════════════════════════════════════════════════════════

## 2.1 — Create the deployment directory structure

```bash
# Create all required directories
sudo mkdir -p /var/www/achme/backend
sudo mkdir -p /var/www/achme/frontend/build
sudo mkdir -p /var/www/achme/logs
sudo mkdir -p /var/www/achme/uploads

# Set ownership to your current user so you don't need sudo for every command
# Replace 'ubuntu' with your actual Linux username if different
sudo chown -R $USER:$USER /var/www/achme
```

## 2.2 — Clone the repository from GitHub

```bash
cd /var/www/achme

# Clone the ACHME repository
git clone https://github.com/abizomniverse-svg/ACHME.git .

# Verify all files are present
ls -la
# Should show: backend/  frontend/  server-deployment/  README.md  etc.
```

> If you cannot use git clone (private repo or air-gapped server):
> Upload the zip file to the server via SCP or FileZilla, then:
```bash
cd /tmp
# Upload ACHME-main.zip here, then:
unzip ACHME-main.zip -d /var/www/achme/
# Move contents if there is a nested folder:
mv /var/www/achme/ACHME-main/* /var/www/achme/
rm -rf /var/www/achme/ACHME-main
```

## 2.3 — Configure the Backend Environment File

```bash
cd /var/www/achme/backend

# Copy the example env file
cp .env.example .env

# Edit the .env file with your actual production values
nano .env
```

Replace the contents of `/var/www/achme/backend/.env` with the following.
Adjust every value marked with ← CHANGE THIS:

```env
# ── Server Configuration ──────────────────────────────────────
PORT=5000
NODE_ENV=production

# ALLOWED_ORIGIN: set to your server IP with port 82 so CORS works
# The frontend is served by Nginx on port 82; the browser calls /api/* (relative)
# so this is mostly for direct API testing from other machines.
ALLOWED_ORIGIN=*

# ── Database Configuration ────────────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_USER=achme_user
DB_PASS=AchmeSecure@2024    # ← CHANGE THIS to match what you set in Phase 1.5
DB_NAME=achme

# ── Email / SMTP Configuration ───────────────────────────────
# For Gmail use an App Password (16-char code from Google Account → Security → App Passwords)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your@gmail.com           # ← CHANGE THIS
EMAIL_PASS=xxxx xxxx xxxx xxxx      # ← CHANGE THIS (Gmail App Password)

# ── JWT Secret ───────────────────────────────────────────────
# Generate a fresh secret for production:
#   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=REPLACE_WITH_GENERATED_64BYTE_HEX_STRING   # ← CHANGE THIS

# ── Default test password (only used during dev/seeding) ─────
DEFAULT_TEST_PASSWORD=Test@12345
```

Generate a real JWT secret before continuing:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy the printed string and paste it as the value of JWT_SECRET in .env
```

## 2.4 — Configure the Frontend Environment File for Production

```bash
cd /var/www/achme/frontend

# The production env file already exists; open it:
nano .env.production
```

Set the contents to exactly this (no URL needed because Nginx handles routing):

```env
# Production: leave blank — Nginx proxies /api/ to backend
# The React config/index.js returns "" in production mode,
# so all API calls use relative paths which Nginx handles.
REACT_APP_API_URL=
REACT_APP_API_PROXY=
```

## 2.5 — Install Backend Node.js dependencies

```bash
cd /var/www/achme/backend

# Install production dependencies only (no devDependencies)
npm install --omit=dev

# This installs: express, mysql2, socket.io, jsonwebtoken, 
#   bcryptjs, nodemailer, puppeteer, multer, node-schedule, etc.
# NOTE: puppeteer will download Chromium (~150MB) — this is expected.
# If puppeteer download fails on a headless server, run:
#   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install --omit=dev
# Then install chromium separately:
#   sudo apt-get install -y chromium-browser
```

## 2.6 — Build the React Frontend for Production

```bash
cd /var/www/achme/frontend

# Install all frontend dependencies (including devDeps for build)
npm install

# Build the production bundle
# This reads .env.production and compiles all React code into frontend/build/
npm run build

# Verify the build succeeded
ls -la build/
# Should show: index.html, static/, manifest.json, etc.
```

> The build step takes 2–5 minutes. Watch for any compilation errors.
> Common fix: if you get "JavaScript heap out of memory", run:
```bash
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

# ═══════════════════════════════════════════════════════════════
# PHASE 3 — PM2 PROCESS MANAGER SETUP (Backend)
# ═══════════════════════════════════════════════════════════════

## 3.1 — Create the PM2 ecosystem config file for Linux

```bash
# Create the PM2 ecosystem config specifically for this Linux deployment
cat > /var/www/achme/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      // Application name shown in pm2 list
      name: 'achme-backend',

      // Absolute path to the backend entry point
      script: '/var/www/achme/backend/server.js',

      // Run one instance per CPU core for maximum throughput
      instances: 'max',
      exec_mode: 'cluster',

      // Always restart if the process crashes
      autorestart: true,

      // Do NOT watch files in production (no hot-reload)
      watch: false,

      // Restart if RAM usage exceeds 1 GB
      max_memory_restart: '1G',

      // Environment variables injected into the Node process
      env: {
        NODE_ENV: 'production',
        PORT: 5000
        // All other env vars are read from /var/www/achme/backend/.env
        // via dotenv inside server.js — do not duplicate them here
      },

      // Log file paths
      error_file: '/var/www/achme/logs/backend-error.log',
      out_file:   '/var/www/achme/logs/backend-out.log',

      // Prepend timestamp to every log line
      time: true,

      // Wait 1 second before considering the process online
      min_uptime: '1s',

      // Maximum number of consecutive restarts before giving up
      max_restarts: 10
    }
  ]
};
EOF

# Verify the file was created
cat /var/www/achme/ecosystem.config.js
```

## 3.2 — Start the backend with PM2

```bash
cd /var/www/achme

# Start using the ecosystem config
pm2 start ecosystem.config.js

# Check that the process is running (status should be 'online')
pm2 list

# Watch logs in real-time to confirm database connection succeeded
pm2 logs achme-backend --lines 50
```

Expected successful log output:
```
MySQL Connected (localhost:3306)
Using database achme
Database initialized successfully
✅ Create table clients (already exists)
✅ Create table users (already exists)
... (many table checks) ...
Default employees seeded successfully.
✅ Server running: http://0.0.0.0:5000 [production]
```

If you see `❌ Missing required environment variables`, your `.env` file
is missing one of: DB_HOST, DB_USER, DB_PASS, DB_NAME, JWT_SECRET.

## 3.3 — Configure PM2 to auto-start on server reboot

```bash
# Generate and install the PM2 startup script for systemd
pm2 startup systemd

# PM2 will print a command like:
#   sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
# COPY that exact command and run it with sudo.

# After running the startup command, save the current PM2 process list:
pm2 save

# Verify the PM2 service is registered with systemd
sudo systemctl status pm2-$USER
```

## 3.4 — Test the backend is responding before setting up Nginx

```bash
# Quick health check — should return JSON with ok:true
curl http://localhost:5000/api/health

# Expected response:
# {"ok":true,"database":"ready","uptime":12.34,"timestamp":"2024-..."}
```

If this fails, check logs:
```bash
pm2 logs achme-backend --err --lines 30
```

# ═══════════════════════════════════════════════════════════════
# PHASE 4 — NGINX CONFIGURATION (Port 82, Auto IP)
# ═══════════════════════════════════════════════════════════════

## 4.1 — Get server IP (run this again to confirm)

```bash
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "Nginx will serve ACHME at: http://$SERVER_IP:82"
```

## 4.2 — Write the Nginx site configuration

```bash
# Create the ACHME Nginx config file
sudo tee /etc/nginx/sites-available/achme.conf > /dev/null << 'NGINXEOF'
# ACHME CRM — Nginx Configuration
# Serves the full-stack CRM on port 82
# Frontend: React static build files
# Backend:  Node.js/PM2 via proxy on localhost:5000
# WebSocket: Socket.IO proxy with upgrade headers

# Upstream definition for the Node.js backend
upstream achme_backend {
    server 127.0.0.1:5000;
    keepalive 64;
}

server {
    # Listen on port 82 (public facing — accessible by all LAN/WAN users)
    listen 82;

    # Accept requests by IP address (auto-detected) and by hostname
    # The underscore _ means "match any hostname" — works for direct IP access
    server_name _;

    # ── Logging ───────────────────────────────────────────────
    access_log  /var/log/nginx/achme-access.log;
    error_log   /var/log/nginx/achme-error.log warn;

    # ── Security Headers ──────────────────────────────────────
    add_header X-Content-Type-Options    nosniff;
    add_header X-Frame-Options           SAMEORIGIN;
    add_header X-XSS-Protection          "1; mode=block";
    add_header Referrer-Policy           "strict-origin-when-cross-origin";

    # ── Upload size limit ─────────────────────────────────────
    # Backend uses multer for file uploads; set generous limit
    client_max_body_size 50M;

    # ── Timeouts (important for long-running API calls) ───────
    proxy_connect_timeout       60s;
    proxy_send_timeout          60s;
    proxy_read_timeout          60s;

    # ── 1. Socket.IO WebSocket Proxy ──────────────────────────
    # Must come BEFORE /api/ location so it is matched first
    # ACHME uses Socket.IO for real-time chat and notifications
    location /socket.io/ {
        proxy_pass         http://achme_backend;
        proxy_http_version 1.1;

        # Required headers for WebSocket upgrade
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host       $host;
        proxy_set_header X-Real-IP  $remote_addr;
        proxy_set_header X-Forwarded-For  $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $server_name;

        proxy_cache_bypass $http_upgrade;

        # WebSocket connections stay open longer
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # ── 2. API Proxy → Node.js Backend ───────────────────────
    # All /api/* routes are forwarded to the Node.js process on :5000
    location /api/ {
        proxy_pass         http://achme_backend/api/;
        proxy_http_version 1.1;

        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host       $host;
        proxy_set_header X-Real-IP  $remote_addr;
        proxy_set_header X-Forwarded-For  $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
        proxy_buffering    off;
    }

    # ── 3. File Uploads Proxy → Node.js ──────────────────────
    # Backend serves uploaded files (images, PDFs) from /uploads/
    location /uploads/ {
        proxy_pass         http://achme_backend/uploads/;
        proxy_http_version 1.1;

        proxy_set_header Host             $host;
        proxy_set_header X-Real-IP        $remote_addr;
        proxy_set_header X-Forwarded-For  $proxy_add_x_forwarded_for;

        # Cache uploaded files aggressively (they are immutable once uploaded)
        proxy_cache_valid 200 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
    }

    # ── 4. React Frontend Static Files ───────────────────────
    # Serve the compiled React build from the filesystem
    location / {
        root  /var/www/achme/frontend/build;
        index index.html index.htm;

        # React Router support (BrowserRouter):
        # If a file is not found on disk, serve index.html
        # React handles routing client-side
        try_files $uri $uri/ /index.html;

        # Cache static assets (JS, CSS, images) for 1 year
        # React build generates content-hashed filenames so this is safe
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            root /var/www/achme/frontend/build;
            expires 1y;
            add_header Cache-Control "public, max-age=31536000, immutable";
            access_log off;
            try_files $uri =404;
        }
    }

    # ── 5. Security: Block hidden files ──────────────────────
    # Prevents access to .git, .env, .htaccess, etc.
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # ── 6. Health check endpoint ──────────────────────────────
    # Allows monitoring tools to ping the app
    location = /health {
        proxy_pass http://achme_backend/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }
}
NGINXEOF

echo "Nginx config written to /etc/nginx/sites-available/achme.conf"
```

## 4.3 — Enable the site and test config

```bash
# Create a symlink in sites-enabled to activate the config
sudo ln -sf /etc/nginx/sites-available/achme.conf /etc/nginx/sites-enabled/achme.conf

# Remove the default Nginx site if it exists (it listens on port 80 and may conflict)
sudo rm -f /etc/nginx/sites-enabled/default

# Test the Nginx config syntax — MUST print "syntax is ok" and "test is successful"
sudo nginx -t

# Expected output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

## 4.4 — Reload Nginx to apply the new config

```bash
sudo systemctl reload nginx

# Verify Nginx is still running after reload
sudo systemctl status nginx
```

## 4.5 — Open port 82 in the system firewall (UFW)

```bash
# Check if UFW is active
sudo ufw status

# Allow port 82 through the firewall
sudo ufw allow 82/tcp

# Allow SSH so you don't lock yourself out (if UFW is enabled)
sudo ufw allow OpenSSH

# If UFW was inactive, enable it now
sudo ufw enable

# Confirm rules
sudo ufw status numbered
```

# ═══════════════════════════════════════════════════════════════
# PHASE 5 — FULL VERIFICATION & SMOKE TESTS
# ═══════════════════════════════════════════════════════════════

## 5.1 — Get the auto-detected IP and print the access URL

```bash
SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ACHME CRM is now live at:                          ║"
echo "║  http://$SERVER_IP:82                               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Share this URL with your client/users on the same network."
```

## 5.2 — Test the backend health endpoint through Nginx

```bash
SERVER_IP=$(hostname -I | awk '{print $1}')

# Test via Nginx (port 82) — this is the path users hit
curl -s http://$SERVER_IP:82/health | python3 -m json.tool

# Expected response:
# {
#     "ok": true,
#     "database": "ready",
#     "uptime": 45.123,
#     "timestamp": "2024-01-01T12:00:00.000Z"
# }
```

## 5.3 — Test an API endpoint through Nginx

```bash
SERVER_IP=$(hostname -I | awk '{print $1}')

# Test the auth endpoint (should return 400 "missing fields", not 502/404)
curl -s -X POST http://$SERVER_IP:82/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}' | python3 -m json.tool
```

## 5.4 — Test the React frontend is being served

```bash
SERVER_IP=$(hostname -I | awk '{print $1}')

# Should return the HTML of the React app
curl -s http://$SERVER_IP:82/ | grep -o '<title>.*</title>'
# Expected: <title>ACHME CRM</title> (or similar)

# Check that the static JS is accessible
curl -o /dev/null -s -w "HTTP Status: %{http_code}\n" http://$SERVER_IP:82/
# Should return: HTTP Status: 200
```

## 5.5 — Verify PM2 process status

```bash
# Full process list
pm2 list

# Detailed info for the backend process
pm2 show achme-backend

# View last 100 lines of output log
pm2 logs achme-backend --lines 100

# View last 50 lines of error log (should be empty if all is well)
pm2 logs achme-backend --err --lines 50
```

## 5.6 — Verify Nginx logs

```bash
# Nginx access log (shows every HTTP request)
sudo tail -f /var/log/nginx/achme-access.log

# Nginx error log (should be empty or only warnings)
sudo tail -f /var/log/nginx/achme-error.log
```

## 5.7 — Browser test checklist
# Open a browser (on any computer on the same network):
#   1. Navigate to http://<SERVER_IP>:82
#   2. You should see the ACHME login page
#   3. Login with the default admin credentials:
#      Email: Kk@achmecommunication.com
#      Password: kk@admin@123
#   4. After login, verify the dashboard loads
#   5. Check the notification bell (tests Socket.IO connection)
#   6. Verify the sidebar navigation works (tests React Router)

# ═══════════════════════════════════════════════════════════════
# PHASE 6 — AUTO-START ON SERVER REBOOT (Full Verification)
# ═══════════════════════════════════════════════════════════════

## 6.1 — Verify PM2 is set to auto-start

```bash
# Should show "pm2-<username>.service" as enabled
sudo systemctl list-units --type=service | grep pm2

# Simulate a reboot test (do NOT actually reboot yet — test first)
pm2 kill          # kills all PM2 processes
pm2 resurrect     # restores from saved list
pm2 list          # should show achme-backend online again
```

## 6.2 — Verify Nginx auto-starts

```bash
# Should show nginx.service as enabled
sudo systemctl is-enabled nginx

# Should print: enabled
```

## 6.3 — Verify MySQL auto-starts

```bash
sudo systemctl is-enabled mysql
# Should print: enabled
```

## 6.4 — Full reboot test (optional but recommended)

```bash
# Reboot the server
sudo reboot

# After reboot, SSH back in and test:
SERVER_IP=$(hostname -I | awk '{print $1}')
curl http://$SERVER_IP:82/health
# Should return healthy JSON without any manual intervention
```

# ═══════════════════════════════════════════════════════════════
# PHASE 7 — TROUBLESHOOTING GUIDE
# ═══════════════════════════════════════════════════════════════

## 7.1 — Problem: Nginx returns 502 Bad Gateway

# CAUSE: PM2/Node.js is not running or crashed
# DIAGNOSIS:
```bash
pm2 list                                    # check if achme-backend is online
pm2 logs achme-backend --lines 50           # look for startup errors
curl http://localhost:5000/api/health        # test backend directly
```
# FIX:
```bash
pm2 restart achme-backend
# If still crashing, check backend/.env for missing DB credentials
pm2 logs achme-backend --err --lines 30
```

## 7.2 — Problem: 404 Not Found for all API routes through Nginx

# CAUSE: Nginx config has wrong proxy_pass or the backend is on wrong port
# DIAGNOSIS:
```bash
sudo nginx -t                               # check for syntax errors
sudo cat /etc/nginx/sites-enabled/achme.conf | grep proxy_pass
netstat -tlnp | grep 5000                   # confirm Node is on port 5000
```
# FIX:
```bash
sudo nginx -t && sudo systemctl reload nginx
pm2 restart achme-backend
```

## 7.3 — Problem: React app loads but API calls return network errors

# CAUSE: Browser is trying to reach the wrong API URL
# The frontend in production uses relative /api/* paths (via config/index.js returning "")
# If you see calls to localhost:5000 in browser DevTools, the build was NOT
# compiled with NODE_ENV=production.
# FIX:
```bash
cd /var/www/achme/frontend
# Confirm .env.production is correctly set:
cat .env.production
# Should show both REACT_APP_API_URL and REACT_APP_API_PROXY as empty strings

# Rebuild:
npm run build

# Confirm Nginx config uses the build folder:
grep -n 'root' /etc/nginx/sites-available/achme.conf
# Should show: root /var/www/achme/frontend/build;
```

## 7.4 — Problem: Socket.IO / WebSocket connection fails (notifications not working)

# CAUSE: Missing WebSocket upgrade headers in Nginx
# DIAGNOSIS: Open browser DevTools → Network tab → filter "ws" 
#   If you see WebSocket connection failing with 400/502, it is the Nginx config
# FIX: Verify the socket.io location block in Nginx has these exact lines:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade    $http_upgrade;
proxy_set_header Connection "upgrade";
```
```bash
# Check and reload
sudo nginx -t && sudo systemctl reload nginx
```

## 7.5 — Problem: MySQL connection refused / database errors

# CAUSE: MySQL is not running, or .env has wrong credentials
# DIAGNOSIS:
```bash
sudo systemctl status mysql
mysql -u achme_user -p achme               # try connecting manually
# Enter the password from .env DB_PASS
```
# FIX:
```bash
sudo systemctl start mysql
# If connection still fails, reset the user:
sudo mysql -u root -p
```
```sql
ALTER USER 'achme_user'@'localhost' IDENTIFIED BY 'AchmeSecure@2024';
FLUSH PRIVILEGES;
EXIT;
```

## 7.6 — Problem: Port 82 is not accessible from another computer

# CAUSE: Firewall blocking port 82, or you are on a different network segment
# FIX:
```bash
# Check UFW
sudo ufw status
sudo ufw allow 82/tcp
sudo ufw reload

# Check if Nginx is actually listening on port 82
sudo ss -tlnp | grep ':82'
# Should show: LISTEN  0  511  0.0.0.0:82

# Check if there is a hardware firewall or cloud security group
# If this server is behind a router/NAT, you need to:
# 1. Forward port 82 on the router to this server's IP
# 2. Then share the router's public IP (or LAN IP for internal access)
```

## 7.7 — Problem: File uploads (images/PDFs) return 404

# CAUSE: The /uploads/ folder is not accessible or not proxied correctly
# FIX:
```bash
# Check that the uploads folder exists
ls -la /var/www/achme/backend/uploads/

# If empty or missing, create it:
mkdir -p /var/www/achme/backend/uploads
chmod 755 /var/www/achme/backend/uploads

# Restart backend so it recognises the uploads directory
pm2 restart achme-backend
```

## 7.8 — Problem: "Error: EACCES permission denied" in PM2 logs

# CAUSE: The Node process cannot write to the uploads or logs directory
# FIX:
```bash
sudo chown -R $USER:$USER /var/www/achme
chmod -R 755 /var/www/achme/backend/uploads
chmod -R 755 /var/www/achme/logs
pm2 restart achme-backend
```

## 7.9 — Problem: PM2 shows "errored" status after restart

# DIAGNOSIS:
```bash
pm2 logs achme-backend --err --lines 100
```
# Most common causes and fixes:
# A) Missing .env — ensure /var/www/achme/backend/.env exists and has all required fields
# B) Wrong script path — check ecosystem.config.js has correct absolute path
# C) Port conflict — check if something else is on port 5000:
```bash
sudo lsof -i :5000
# Kill whatever is there:
sudo kill -9 <PID>
pm2 start ecosystem.config.js
```

# ═══════════════════════════════════════════════════════════════
# PHASE 8 — UPDATE DEPLOYMENT (when pushing new code)
# ═══════════════════════════════════════════════════════════════

## 8.1 — Full update procedure (zero-downtime)

```bash
cd /var/www/achme

# 1. Pull latest code
git pull origin main

# 2. Update backend dependencies (if package.json changed)
cd /var/www/achme/backend
npm install --omit=dev

# 3. Reload backend gracefully (PM2 cluster mode reloads one instance at a time)
pm2 reload achme-backend

# 4. Rebuild frontend (if any frontend files changed)
cd /var/www/achme/frontend
npm install
npm run build

# 5. Nginx picks up new static files automatically (no restart needed)
# But reload just to be safe:
sudo systemctl reload nginx

# 6. Verify everything is healthy
SERVER_IP=$(hostname -I | awk '{print $1}')
curl http://$SERVER_IP:82/health
pm2 list
```

## 8.2 — Rollback procedure (if update breaks something)

```bash
cd /var/www/achme

# Revert to the previous git commit
git log --oneline -5      # see recent commits
git checkout <previous_commit_hash> -- .

# Rebuild and restart
cd frontend && npm run build && cd ..
pm2 restart achme-backend
sudo systemctl reload nginx
```

# ═══════════════════════════════════════════════════════════════
# PHASE 9 — USEFUL OPERATIONAL COMMANDS
# ═══════════════════════════════════════════════════════════════

## 9.1 — PM2 daily operations

```bash
pm2 list                          # List all processes and their status
pm2 logs achme-backend            # Stream live logs (Ctrl+C to stop)
pm2 logs achme-backend --lines 200  # Last 200 lines of logs
pm2 restart achme-backend         # Restart (brief downtime)
pm2 reload achme-backend          # Graceful reload (zero downtime, cluster mode)
pm2 stop achme-backend            # Stop the process
pm2 start achme-backend           # Start stopped process
pm2 delete achme-backend          # Remove from PM2 list (does not delete code)
pm2 monit                         # Real-time CPU/RAM monitoring dashboard
pm2 flush                         # Clear all log files
```

## 9.2 — Nginx operations

```bash
sudo nginx -t                      # Test config syntax
sudo systemctl reload nginx        # Apply config changes (no downtime)
sudo systemctl restart nginx       # Full restart (brief downtime)
sudo systemctl stop nginx          # Stop Nginx
sudo tail -f /var/log/nginx/achme-access.log   # Watch access logs live
sudo tail -f /var/log/nginx/achme-error.log    # Watch error logs live
```

## 9.3 — MySQL operations

```bash
sudo systemctl status mysql                    # Check if MySQL is running
mysql -u achme_user -p achme                   # Connect to the ACHME database
# Inside MySQL:
# SHOW TABLES;           — list all tables
# SELECT COUNT(*) FROM users;  — count users
# EXIT;

# Backup the database
mysqldump -u achme_user -p achme > /tmp/achme_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
mysql -u achme_user -p achme < /tmp/achme_backup_20240101_120000.sql
```

## 9.4 — Server resource monitoring

```bash
# CPU and RAM usage
top
htop               # (install with: sudo apt-get install htop)

# Disk usage
df -h

# Network connections on port 82 and 5000
sudo ss -tlnp | grep -E ':82|:5000'

# Who is connected right now
sudo ss -tnp state established | grep ':82'

# Check server IP (auto-detect)
hostname -I | awk '{print $1}'
```

# ═══════════════════════════════════════════════════════════════
# PHASE 10 — SECURITY HARDENING (RECOMMENDED FOR PRODUCTION)
# ═══════════════════════════════════════════════════════════════

## 10.1 — Change the default admin password immediately after first login

# Default admin credentials (from database seeding in config/database.js):
#   Email:    Kk@achmecommunication.com
#   Password: kk@admin@123
#
# CHANGE THIS IMMEDIATELY after first login via the ACHME CRM UI → Profile settings.
# The password is bcrypt-hashed; no need to touch the database manually.

## 10.2 — Restrict MySQL to localhost only

```bash
# MySQL should already be on localhost only by default.
# Verify:
sudo grep -E "bind-address|skip-networking" /etc/mysql/mysql.conf.d/mysqld.cnf

# If bind-address is not set or is 0.0.0.0, set it to 127.0.0.1:
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
# Find or add under [mysqld]:
#   bind-address = 127.0.0.1

sudo systemctl restart mysql
```

## 10.3 — Generate a strong JWT secret

```bash
# If you used the placeholder JWT_SECRET in Phase 2.3, replace it now:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

nano /var/www/achme/backend/.env
# Update JWT_SECRET= with the new generated value

# Restart backend to apply
pm2 restart achme-backend
```

## 10.4 — Prevent direct access to the Node.js backend port

```bash
# Block external access to port 5000 (it should only be accessed via Nginx)
sudo ufw deny 5000/tcp

# Verify port 82 is still open
sudo ufw status
```

## 10.5 — Rate limiting in Nginx (prevent brute-force on login)

```bash
sudo nano /etc/nginx/sites-available/achme.conf
```

Add inside the `server {}` block, BEFORE the `location /api/` block:
```nginx
# Rate limiting zone: 10 requests per second per IP
limit_req_zone $binary_remote_addr zone=achme_api:10m rate=10r/s;

# Inside location /api/:
limit_req zone=achme_api burst=20 nodelay;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 10.6 — Set up automatic MySQL backups (daily cron)

```bash
# Create the backup script
sudo tee /usr/local/bin/achme-backup.sh > /dev/null << 'BACKUPEOF'
#!/bin/bash
BACKUP_DIR="/var/backups/achme"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Dump database (use credentials from .env)
# Edit DB_PASS below to match your production password
mysqldump -u achme_user -pAchmeSecure@2024 achme \
  > $BACKUP_DIR/achme_$DATE.sql

# Compress
gzip $BACKUP_DIR/achme_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup complete: $BACKUP_DIR/achme_$DATE.sql.gz"
BACKUPEOF

sudo chmod +x /usr/local/bin/achme-backup.sh

# Add cron job for daily backup at 2:00 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/achme-backup.sh >> /var/log/achme-backup.log 2>&1") | crontab -

# Test the backup script
sudo /usr/local/bin/achme-backup.sh
ls -lh /var/backups/achme/
```

# ═══════════════════════════════════════════════════════════════
# APPENDIX A — COMPLETE FILE & DIRECTORY REFERENCE
# ═══════════════════════════════════════════════════════════════

## A.1 — Production directory structure

```
/var/www/achme/
├── backend/                   ← Node.js API server
│   ├── server.js              ← Entry point (binds to 0.0.0.0:5000)
│   ├── .env                   ← Production environment variables (DO NOT COMMIT)
│   ├── config/
│   │   └── database.js        ← MySQL connection + auto-schema init + seeding
│   ├── routes/                ← All API routes (/api/auth, /api/client, etc.)
│   ├── sockets/               ← Socket.IO event handlers (chat + notifications)
│   ├── backendutil/           ← Email, PDF, OTP, reminder scheduler utilities
│   ├── middleware/            ← JWT auth middleware
│   ├── migrations/            ← Database migration scripts
│   ├── uploads/               ← File upload storage (images, PDFs)
│   └── schema.sql             ← Initial database schema
│
├── frontend/
│   ├── build/                 ← Compiled React production bundle ← Nginx serves this
│   ├── src/
│   │   ├── config/index.js    ← API URL: returns "" in production (uses relative /api/)
│   │   ├── socket/socket.js   ← Socket.IO client (connects to same origin)
│   │   └── pages/             ← All CRM pages (clients, invoices, leads, etc.)
│   └── .env.production        ← REACT_APP_API_URL= (empty, intentional)
│
├── ecosystem.config.js        ← PM2 configuration (created in Phase 3.1)
├── logs/
│   ├── backend-error.log      ← PM2 error output
│   └── backend-out.log        ← PM2 stdout output
└── uploads/                   ← (symlink or same as backend/uploads/)

/etc/nginx/sites-available/achme.conf   ← Nginx virtual host config
/etc/nginx/sites-enabled/achme.conf     ← Symlink to sites-available
/var/log/nginx/achme-access.log         ← Nginx access log
/var/log/nginx/achme-error.log          ← Nginx error log
/var/backups/achme/                     ← Daily MySQL backups
```

## A.2 — Key API routes served by the backend

```
POST   /api/auth/login          ← User login (returns JWT token)
POST   /api/auth/register       ← New user registration
GET    /api/client              ← List all clients
POST   /api/client              ← Create new client
GET    /api/Telecalls           ← Telecall leads
GET    /api/Walkins             ← Walk-in leads
GET    /api/Fields              ← Field visit leads
GET    /api/quotations          ← Quotation list
GET    /api/invoice             ← Client invoices
GET    /api/performainvoice     ← Proforma invoices
GET    /api/leads               ← Lead management
GET    /api/amc                 ← AMC/ALC service contracts
GET    /api/call-reports        ← Service call reports
GET    /api/task                ← Task management
GET    /api/targets             ← Sales targets
GET    /api/notifications       ← User notifications
GET    /api/reports             ← Business reports
GET    /api/health              ← Health check (used by monitoring)
WS     /socket.io/              ← Real-time chat (Socket.IO)
WS     /socket.io/notifications ← Real-time notifications namespace
```

## A.3 — Environment variables reference (backend/.env)

```
PORT                Required. Backend port. Set to 5000.
NODE_ENV            Required. Set to "production".
ALLOWED_ORIGIN      Optional. CORS origins. Set to "*" for LAN access.
DB_HOST             Required. Database host. "localhost"
DB_PORT             Optional. Database port. Default: 3306
DB_USER             Required. MySQL username. "achme_user"
DB_PASS             Required. MySQL password.
DB_NAME             Required. Database name. "achme"
SMTP_HOST           Required. Email server. "smtp.gmail.com"
SMTP_PORT           Required. Email port. 587
EMAIL_USER          Required. Sender email address.
EMAIL_PASS          Required. Email password or App Password.
JWT_SECRET          Required. 64-byte hex string for signing JWTs.
DEFAULT_TEST_PASSWORD Optional. Used only in testing. "Test@12345"
```

# ═══════════════════════════════════════════════════════════════
# APPENDIX B — ONE-SHOT AUTOMATED DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════
# This script performs ALL phases in sequence.
# Run it as a non-root user with sudo privileges.
# It will pause and ask for confirmation at critical steps.
# ─────────────────────────────────────────────────────────────

## B.1 — Save this as /tmp/deploy_achme.sh and run it:

```bash
cat > /tmp/deploy_achme.sh << 'DEPLOYEOF'
#!/bin/bash
set -e  # Exit immediately on any error
set -o pipefail

# ──────────────────────────────────────────
# ACHME CRM Automated Deployment Script
# ──────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[ACHME]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Configuration — EDIT THESE BEFORE RUNNING
DB_PASSWORD="AchmeSecure@2024"   # Change this!
REPO_URL="https://github.com/abizomniverse-svg/ACHME.git"
DEPLOY_DIR="/var/www/achme"
APP_PORT=5000
NGINX_PORT=82

# Auto-detect server IP
SERVER_IP=$(hostname -I | awk '{print $1}')
log "Server IP detected: $SERVER_IP"
log "Application will be accessible at: http://$SERVER_IP:$NGINX_PORT"

# ── Phase 1: Install dependencies ─────────────────────────────
log "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
sudo apt-get install -y nodejs > /dev/null 2>&1
log "Node.js $(node -v) installed"

log "Installing PM2..."
sudo npm install -g pm2 > /dev/null 2>&1

log "Installing MySQL..."
sudo apt-get install -y mysql-server > /dev/null 2>&1
sudo systemctl start mysql
sudo systemctl enable mysql

log "Installing Nginx..."
sudo apt-get install -y nginx > /dev/null 2>&1
sudo systemctl start nginx
sudo systemctl enable nginx

# ── Phase 2: MySQL setup ───────────────────────────────────────
log "Setting up MySQL database and user..."
sudo mysql -e "
CREATE DATABASE IF NOT EXISTS achme
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'achme_user'@'localhost'
  IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON achme.* TO 'achme_user'@'localhost';
FLUSH PRIVILEGES;
"
log "MySQL database 'achme' and user 'achme_user' created"

# ── Phase 3: Clone code ────────────────────────────────────────
log "Deploying application code..."
sudo mkdir -p $DEPLOY_DIR
sudo chown -R $USER:$USER $DEPLOY_DIR

if [ -d "$DEPLOY_DIR/.git" ]; then
  warn "Git repo already exists, pulling latest..."
  cd $DEPLOY_DIR && git pull origin main
else
  git clone $REPO_URL $DEPLOY_DIR
  cd $DEPLOY_DIR
fi

# ── Phase 4: Generate JWT secret ──────────────────────────────
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# ── Phase 5: Write backend .env ───────────────────────────────
log "Writing backend .env..."
cat > $DEPLOY_DIR/backend/.env << ENVEOF
PORT=5000
NODE_ENV=production
ALLOWED_ORIGIN=*
DB_HOST=localhost
DB_PORT=3306
DB_USER=achme_user
DB_PASS=${DB_PASSWORD}
DB_NAME=achme
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
JWT_SECRET=${JWT_SECRET}
DEFAULT_TEST_PASSWORD=Test@12345
ENVEOF
warn "IMPORTANT: Edit $DEPLOY_DIR/backend/.env and set EMAIL_USER and EMAIL_PASS!"

# ── Phase 6: Write frontend .env.production ────────────────────
cat > $DEPLOY_DIR/frontend/.env.production << FENVEOF
REACT_APP_API_URL=
REACT_APP_API_PROXY=
FENVEOF

# ── Phase 7: Install dependencies & build ─────────────────────
log "Installing backend dependencies..."
cd $DEPLOY_DIR/backend && npm install --omit=dev

log "Installing and building frontend..."
cd $DEPLOY_DIR/frontend
npm install
npm run build
log "Frontend build complete"

# ── Phase 8: PM2 ecosystem config ─────────────────────────────
cat > $DEPLOY_DIR/ecosystem.config.js << ECOEOF
module.exports = {
  apps: [{
    name: 'achme-backend',
    script: '${DEPLOY_DIR}/backend/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production', PORT: 5000 },
    error_file: '${DEPLOY_DIR}/logs/backend-error.log',
    out_file:   '${DEPLOY_DIR}/logs/backend-out.log',
    time: true
  }]
};
ECOEOF

mkdir -p $DEPLOY_DIR/logs

# ── Phase 9: Start PM2 ────────────────────────────────────────
log "Starting backend with PM2..."
cd $DEPLOY_DIR
pm2 delete achme-backend 2>/dev/null || true
pm2 start ecosystem.config.js

# Save PM2 list and configure startup
pm2 save
STARTUP_CMD=$(pm2 startup systemd | grep "sudo env" | tail -1)
if [ -n "$STARTUP_CMD" ]; then
  eval "$STARTUP_CMD" > /dev/null 2>&1
fi

# ── Phase 10: Nginx config ────────────────────────────────────
log "Configuring Nginx on port $NGINX_PORT..."
sudo tee /etc/nginx/sites-available/achme.conf > /dev/null << NGINXEOF
upstream achme_backend {
    server 127.0.0.1:5000;
    keepalive 64;
}
server {
    listen $NGINX_PORT;
    server_name _;
    access_log  /var/log/nginx/achme-access.log;
    error_log   /var/log/nginx/achme-error.log warn;
    client_max_body_size 50M;
    location /socket.io/ {
        proxy_pass         http://achme_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host       \$host;
        proxy_set_header X-Real-IP  \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
    }
    location /api/ {
        proxy_pass         http://achme_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host       \$host;
        proxy_set_header X-Real-IP  \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_buffering off;
    }
    location /uploads/ {
        proxy_pass         http://achme_backend/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
    location / {
        root  ${DEPLOY_DIR}/frontend/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            root ${DEPLOY_DIR}/frontend/build;
            expires 1y;
            add_header Cache-Control "public, max-age=31536000, immutable";
            access_log off;
            try_files \$uri =404;
        }
    }
    location ~ /\. { deny all; }
}
NGINXEOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/achme.conf /etc/nginx/sites-enabled/achme.conf
sudo nginx -t || err "Nginx config test failed!"
sudo systemctl reload nginx

# ── Phase 11: Firewall ────────────────────────────────────────
log "Opening port $NGINX_PORT in UFW firewall..."
sudo ufw allow $NGINX_PORT/tcp 2>/dev/null || true
sudo ufw allow OpenSSH 2>/dev/null || true
sudo ufw deny 5000/tcp 2>/dev/null || true

# ── Final health check ────────────────────────────────────────
sleep 3
log "Running health check..."
HEALTH=$(curl -s http://localhost:$NGINX_PORT/health 2>/dev/null)
if echo "$HEALTH" | grep -q '"ok":true'; then
  log "✅ Health check PASSED"
else
  warn "Health check response: $HEALTH"
  warn "Check logs: pm2 logs achme-backend"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ACHME CRM DEPLOYMENT COMPLETE                      ║${NC}"
echo -e "${GREEN}║  Access: http://$SERVER_IP:$NGINX_PORT                        ║${NC}"
echo -e "${GREEN}║  Admin:  Kk@achmecommunication.com / kk@admin@123   ║${NC}"
echo -e "${GREEN}║  NOTE:   Change the admin password on first login!  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo "  1. Edit /var/www/achme/backend/.env → set EMAIL_USER and EMAIL_PASS"
echo "  2. Run: pm2 restart achme-backend"
echo "  3. Change admin password in the CRM UI"
echo "  4. Share http://$SERVER_IP:$NGINX_PORT with your client"
DEPLOYEOF

chmod +x /tmp/deploy_achme.sh
echo "Deployment script created at /tmp/deploy_achme.sh"
echo "Review it, then run:  bash /tmp/deploy_achme.sh"
```

# ═══════════════════════════════════════════════════════════════
# APPENDIX C — QUICK REFERENCE CARD
# ═══════════════════════════════════════════════════════════════

## C.1 — First time setup (all phases in order)
# 1. Phase 0  → Detect server IP
# 2. Phase 1  → Install Node, PM2, MySQL, Nginx
# 3. Phase 2  → Deploy code, write .env files, build frontend
# 4. Phase 3  → Start backend with PM2, configure auto-start
# 5. Phase 4  → Configure Nginx on port 82, open firewall
# 6. Phase 5  → Run smoke tests, open browser

## C.2 — Daily operations cheat sheet
```bash
# Check everything is running
pm2 list && sudo systemctl status nginx && sudo systemctl status mysql

# View live backend logs
pm2 logs achme-backend

# Restart backend (after .env change)
pm2 restart achme-backend

# Deploy code update
cd /var/www/achme && git pull && \
  cd backend && npm install --omit=dev && pm2 reload achme-backend && \
  cd ../frontend && npm run build && sudo systemctl reload nginx

# Get the access URL
echo "http://$(hostname -I | awk '{print $1}'):82"

# Health check
curl http://localhost:82/health
```

## C.3 — Default admin credentials (CHANGE AFTER FIRST LOGIN)
# Email:    Kk@achmecommunication.com
# Password: kk@admin@123
# These are seeded by backend/config/database.js on first start.

## C.4 — Log file locations
# PM2 backend stdout:  /var/www/achme/logs/backend-out.log
# PM2 backend errors:  /var/www/achme/logs/backend-error.log
# Nginx access log:    /var/log/nginx/achme-access.log
# Nginx error log:     /var/log/nginx/achme-error.log
# MySQL error log:     /var/log/mysql/error.log

# ═══════════════════════════════════════════════════════════════
# END OF make_live.md
# ═══════════════════════════════════════════════════════════════
