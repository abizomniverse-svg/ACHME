# 🐳 ACHME Communication CRM - Dockerization Guide

Welcome to the Docker guide for the ACHME Communication CRM system. This guide provides step-by-step instructions on setting up, running, and managing your containerized multi-service application (Frontend, Backend, and MySQL database).

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your system:

1. **Docker Desktop for Windows**:
   * Download and install from the [Docker Official Website](https://www.docker.com/products/docker-desktop/).
   * During installation, ensure the **WSL 2 based engine** option is checked (recommended for performance).
2. **Git** (optional, to clone and manage the codebase).

> [!IMPORTANT]
> Make sure **Docker Desktop is running** before executing any commands or running the batch script. You can verify it is active by looking for the green Docker icon in your Windows taskbar tray.

---

## 🚀 Quick Start (Automated One-Click Setup)

We have provided a fully automated orchestrator script `docker.bat` in the root of the project. It automatically verifies your Docker installation, sets up default configuration values, spins up all three containers, and waits for the database to report a healthy status.

### How to Run:
1. Open a terminal (Command Prompt, PowerShell, or Git Bash) in the project root directory:
   ```cmd
   cd d:\ACHME_COMUNICATION
   ```
2. Simply double-click `docker.bat` in Windows File Explorer, or execute it from your terminal:
   ```cmd
   .\docker.bat
   ```

The script will:
* Check for Docker Desktop.
* Automatically detect and support either `docker-compose` or `docker compose` syntax depending on your Docker version.
* Generate a root `.env` configuration file containing secure default settings if it is missing.
* Gracefully stop any existing or orphaned CRM containers.
* Build the frontend and backend Docker images cleanly.
* Launch MySQL, Backend, and Frontend containers in detached mode.
* Wait and poll the database container's health check until MySQL is fully ready.
* Present a success console summary with all service URLs.

---

## 🌐 Services Architecture

When the containers are successfully launched, they are mapped to your local system at the following ports:

| Service | Technology | Port Mapping | Container Name | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | React | `http://localhost:3000` | `achme-frontend` | Customer-facing React dashboard. |
| **Backend** | Express (Node.js) | `http://localhost:5000` | `achme-backend` | Express REST API server. |
| **MySQL** | MySQL 8.0 | `localhost:3306` | `achme-mysql` | Database storing users, leads, invoices, etc. |

---

## ⚙️ Environment Configurations (`.env`)

You can customize service parameters by editing the `.env` file at the root of the project. Important parameters include:

* `PORT`: Port where the Backend Server runs (default `5000`).
* `DB_NAME`: Database name (default `achme`).
* `MYSQL_ROOT_PASSWORD`: The password for the MySQL `root` user (default `admin@123`).
* `JWT_SECRET`: Secret key used for encoding user authentication tokens.
* `SMTP_HOST` / `EMAIL_USER` / `EMAIL_PASS`: Connection parameters for SMTP mail relay.

> [!TIP]
> If you make changes to your `.env` file, simply run `.\docker.bat` again. The orchestrator will automatically tear down old containers and launch them with the updated environment values.

---

## 🔍 Useful CLI Commands

If you prefer to manage the containers manually, you can use the following commands from the root directory:

### 1. View Service Logs
View live, aggregated logs from all running services:
```bash
docker compose logs -f
```
Or view logs for a single service (e.g., just the Express backend):
```bash
docker compose logs -f backend
```

### 2. Stop the Application
To shut down all containers and networks safely while preserving database data:
```bash
docker compose down
```

### 3. Clear Data (Hard Reset)
If you want to start with a fresh database and wipe all records, tear down the containers along with the persistent volume:
```bash
docker compose down -v
```

### 4. Connect to MySQL Database
You can connect your preferred GUI SQL editor (such as **DBeaver**, **HeidiSQL**, or **MySQL Workbench**) directly to the running container using the following credentials:
* **Host**: `localhost`
* **Port**: `3306`
* **Username**: `root`
* **Password**: `admin@123` (or the custom value set in your `.env`)
* **Database**: `achme`

---

## 🛠️ Troubleshooting & Common Fixes

### ❌ Port Collision Error: "Port 3306 is already in use"
* **Cause**: You already have a local MySQL or MariaDB service running on your Windows host.
* **Fix**: You can stop the local service via Windows Services (`services.msc` -> Find `MySQL` or `MariaDB` -> Click Stop), or edit the `.env` file in the root and change `DB_PORT=3307` to expose the container's database on a different port.

### ❌ Port Collision Error: "Port 5000 is already in use"
* **Cause**: On Windows 11 / macOS, port 5000 is sometimes reserved by default OS services (e.g., SSDP or AirPlay Receiver).
* **Fix**: Change `PORT=5001` (or another free port) in the `.env` file and rerun the script.

### ❌ Changes in Source Code Not Showing in Container
* **Cause**: Docker is running cached versions of the images.
* **Fix**: Run `.\docker.bat` which automatically uses `--no-cache` to force a fresh build, or manually run:
  ```bash
  docker compose build --no-cache
  docker compose up -d
  ```
