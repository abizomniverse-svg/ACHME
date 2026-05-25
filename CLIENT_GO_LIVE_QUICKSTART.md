# ACHME CRM Client Go-Live Quickstart

Use this when you copy `ACHME_COMUNICATION-main` to a client Windows computer.

This guide is for the simple LAN deployment:

```text
Client/employee browser -> http://CLIENT-IP:82 -> Nginx -> Node backend -> MySQL
```

Important:
- The ready-to-use live URL is `http://CLIENT-IP:82`.
- `https://CLIENT-IP:82` is not enabled by default in this setup.
- If you want real HTTPS, we need to add SSL certificates and trusted browser setup separately.

## Before You Start

Use a Windows 10/11 computer that will stay powered on during office hours.

Recommended:
- Connect the computer to the office WiFi/LAN.
- Keep the folder path simple, for example:

```text
D:\ACHME_COMUNICATION-main
```

or:

```text
C:\ACHME_COMUNICATION-main
```

Avoid putting the folder inside OneDrive, Downloads cleanup folders, or a temporary USB location.

## Step By Step

1. Copy the full `ACHME_COMUNICATION-main` folder to the client computer.

2. Open the folder.

3. Right-click either file:

```text
start-live.bat
start-server.bat
```

4. Click:

```text
Run as administrator
```

5. If Windows asks for permission, click **Yes**.

6. Wait. First run can take time because it may install/check dependencies, build React, configure Nginx, and initialize MySQL.

7. When it works, the window will show:

```text
ACHME CRM IS LIVE
```

8. Open this on the same computer:

```text
http://localhost:82
```

9. For other users on the same WiFi/LAN, use the IP shown by the script:

```text
http://CLIENT-LAN-IP:82
```

Example:

```text
http://192.168.1.110:82
```

## Success Looks Like

The script should show:

```text
ACHME CRM IS LIVE
```

These checks should work:

```text
http://localhost:82
http://localhost:82/api/health
http://CLIENT-LAN-IP:82
http://CLIENT-LAN-IP:82/api/health
```

The health URL should show JSON like:

```json
{"ok":true,"database":"ready"}
```

Login with:

```text
Email:    Kk@achmecommunication.com
Password: kk@admin@123
```

## What The Script Does

`start-live.bat` calls `start_live_nginx_pm2.bat`, which automates:

- Detects the LAN IP.
- Checks/installs Node.js.
- Checks/installs PM2.
- Checks/starts MySQL.
- Tries to install MySQL with `winget` if missing.
- Checks/downloads Nginx to `C:\nginx`.
- Writes `backend\.env`.
- Writes `frontend\.env.production`.
- Installs backend dependencies.
- Installs frontend dependencies.
- Creates/checks the `achme` database and `achme_user`.
- Builds the React app.
- Copies build files to `C:\nginx\html\achme`.
- Writes `C:\nginx\conf\nginx.conf`.
- Starts backend using PM2 on port `5000`.
- Starts Nginx on port `82`.
- Opens Windows Firewall port `82`.
- Maps `achme.com` on the server computer.
- Installs startup restore for the current Windows user.
- Opens persistent backend and Nginx log windows.

## If It Fails

### If Node.js Fails

Problem signs:

```text
Node.js not found
npm not found
Node.js install failed
```

Fix:

Install Node.js LTS manually:

```text
https://nodejs.org
```

Close the command window, then run `start-live.bat` or `start-server.bat` again as Administrator.

### If MySQL Fails

Problem signs:

```text
MySQL must be installed and running
Could not create MySQL user
Database initialization failed
```

Fix:

Install MySQL Server 8 manually. During setup, use this root password:

```text
admin@123
```

After MySQL setup finishes, run `start-live.bat` or `start-server.bat` again as Administrator.

If MySQL is installed but stopped, start it from Windows Services:

```text
services.msc -> MySQL80 -> Start
```

### If Port 82 Fails

Problem signs:

```text
Nginx did not start
Port 82 is already in use
```

Fix:

Restart the computer and run `start-live.bat` or `start-server.bat` again.

If it still fails, check what uses port `82`:

```cmd
netstat -ano | findstr :82
```

Then close/stop that software and run `start-live.bat` again.

### If Other Computers Cannot Open The App

First confirm the server computer works:

```text
http://localhost:82
```

Then from another computer/phone on the same WiFi, open:

```text
http://CLIENT-LAN-IP:82
```

If it does not open:

1. Make sure both devices are on the same WiFi/LAN.
2. Make sure the server computer is not sleeping.
3. Run `start-live.bat` or `start-server.bat` as Administrator again so it can open the firewall.
4. Check Windows Firewall allows TCP port `82`.

### If `achme.com` Does Not Work

This is normal on employee computers unless you add a hosts entry.

The easy option is to use:

```text
http://CLIENT-LAN-IP:82
```

To make `achme.com` work on an employee Windows PC:

1. Open Notepad as Administrator.
2. Open:

```text
C:\Windows\System32\drivers\etc\hosts
```

3. Add this line, replacing the IP:

```text
CLIENT-LAN-IP    achme.com    www.achme.com
```

Example:

```text
192.168.1.110    achme.com    www.achme.com
```

4. Save the file.

Then open:

```text
http://achme.com:82
```

### If Login Fails

Try the default admin:

```text
Email:    Kk@achmecommunication.com
Password: kk@admin@123
```

If login still fails, check:

```text
http://localhost:82/api/health
```

If health works but login fails, the database may not have seeded users. Run `start-live.bat` or `start-server.bat` again as Administrator.

## Daily Use

After setup, users should use:

```text
http://CLIENT-LAN-IP:82
```

The server computer must stay on and connected to the network.

## After Restart

The setup installs a startup restore script for the current Windows user. After login, it should restore:

- PM2 backend
- Nginx on port `82`

If it does not start automatically, open the folder and run either:

```text
start-live.bat
start-server.bat
```

## Useful Admin Commands

Check backend:

```cmd
pm2 status
pm2 logs achme-backend
show-live-logs.bat
```

Restart backend:

```cmd
pm2 restart achme-backend
```

Reload Nginx:

```cmd
cd C:\nginx
nginx.exe -s reload
```

Stop Nginx:

```cmd
cd C:\nginx
nginx.exe -s stop
```

## Launchers

Both of these now start the live deployment on port `82`:

```text
start-live.bat
start-server.bat
```

Expected live URLs:

```text
http://localhost:82
http://CLIENT-LAN-IP:82
```

If you still see `http://192.168.0.114:3000`, an older development window is still running. Close that old dev process and launch the project again with `start-live.bat` or `start-server.bat`.
