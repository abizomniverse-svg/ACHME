# Implementation Plan - Proper Full-Stack Dockerization with Nginx

This plan outlines the design and files needed to properly dockerize the ACHME CRM full-stack application using **Docker**, **Docker Compose**, and **Nginx** as a high-performance reverse proxy.

---

## Architecture Overview

The system will be comprised of four containerized services running in an isolated Docker network called `crm-network`:

```mermaid
graph TD
    Client[Client Browser] <-->|Port 80/443| Nginx[Nginx Reverse Proxy]
    Nginx <-->|Port 3000| Frontend[React Frontend Container]
    Nginx <-->|Port 5000| Backend[Express Backend Container]
    Backend <-->|Port 3306| MySQL[(MySQL Database Container)]
    
    subgraph Isolated Docker Network (crm-network)
        Nginx
        Frontend
        Backend
        MySQL
    end
    
    subgraph Persistent Storage
        MySQL <--> Volumes[(mysql_data volume)]
        Backend <--> Uploads[(./backend/uploads bind-mount)]
    end
```

### Containers & Ports:
1. **mysql** (container: `achme-mysql`): Exposes MySQL on standard port `3306` inside the network. Mounts named volume `mysql_data` for persistent record storage.
2. **backend** (container: `achme-backend`): Exposes the Node.js Express server on port `5000`. Communicates with the MySQL database container internally. Mounts `./backend/uploads` for media/document persistence.
3. **frontend** (container: `achme-frontend`): Runs a highly optimized React build served by an internal Nginx container on port `3000`.
4. **nginx** (container: `achme-nginx`): The public entrance point. Listens on host port `80`, routing traffic to the frontend and backend using precise proxy rules (including WebSocket support).

---

## User Review Required

> [!IMPORTANT]
> **API URL Routing**:
> - We are using a zero-configuration API routing setup.
> - The React application's API URL is dynamically set based on `NODE_ENV`. In production mode (`npm run build`), it resolves to `""` (empty string).
> - This allows the browser to request relative paths like `/api/...` and `/socket.io/...` which automatically hit Nginx on port `80`.
> - Nginx handles the reverse-proxying internally to route traffic to the respective containers. This avoids hardcoding host IPs/ports!

---

## Proposed Changes

### [DevOps & Infrastructure]

Summary: Create files and configurations for proper containerized execution.

---

#### [NEW] [nginx.conf](file:///d:/ACHME_COMUNICATION/nginx/nginx.conf)
* Create Nginx configuration with the following rules:
  - Serve static frontend routes `/` by proxying to the `frontend:3000` service.
  - Proxy all API requests `/api/` to the `backend:5000/api/` service.
  - Proxy WebSocket chats `/socket.io/` to the `backend:5000/socket.io/` service with HTTP/1.1 and connection upgrade headers.
  - Include secure headers: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, and `Referrer-Policy`.
  - Include high-performance configurations: `gzip` compression, custom timeouts, and custom client upload limits.

#### [NEW] [nginx Dockerfile](file:///d:/ACHME_COMUNICATION/nginx/Dockerfile)
* Create `nginx/Dockerfile` utilizing `nginx:stable-alpine`.
* Copy the custom `nginx.conf` to `/etc/nginx/nginx.conf`.
* Expose port `80` and run the default Nginx entrypoint.

#### [MODIFY] [docker-compose.yml](file:///d:/ACHME_COMUNICATION/docker-compose.yml)
* Add `nginx` reverse-proxy service listening on public port `80`.
* Attach all services (`mysql`, `backend`, `frontend`, `nginx`) to the custom network `crm-network`.
* Ensure strict service starting order using healthchecks:
  - `mysql` healthcheck uses `mysqladmin ping` -> Backend depends on `mysql` being `service_healthy`.
  - `backend` healthcheck uses `wget http://localhost:5000/api/health` -> Nginx depends on both `backend` and `frontend` being healthy.
* Apply `restart: always` to all services.

#### [NEW] [frontend Dockerfile](file:///d:/ACHME_COMUNICATION/frontend/Dockerfile)
* Replace the development Dockerfile with a high-performance multi-stage Dockerfile:
  - **Stage 1 (Build)**: Use `node:18-alpine` to install dependencies and run `npm run build`.
  - **Stage 2 (Serve)**: Use `nginx:alpine` listening on port `3000` internally to serve the static build files with minimal memory and CPU usage.

#### [NEW] [frontend .dockerignore](file:///d:/ACHME_COMUNICATION/frontend/.dockerignore)
* Create `.dockerignore` to ignore `node_modules`, `build`, `.env`, and git logs.

#### [NEW] [backend Dockerfile](file:///d:/ACHME_COMUNICATION/backend/Dockerfile)
* Set up standard backend environment with Node 18, clean production install (`npm ci --only=production`), and execution command using `node server.js` (no PM2 wrapper).

#### [NEW] [backend .dockerignore](file:///d:/ACHME_COMUNICATION/backend/.dockerignore)
* Ensure `node_modules`, `.env`, and log files are excluded from the Docker build context.

#### [MODIFY] [docker.bat](file:///d:/ACHME_COMUNICATION/docker.bat)
* Update the orchestrator launcher to:
  - Automatically create the root `.env` if missing.
  - Shut down old instances (`docker compose down --remove-orphans`).
  - Run the full build (`docker compose build`).
  - Spin up all containers including Nginx (`docker compose up -d`).
  - Poll health statuses of MySQL, Backend, Frontend, and Nginx.
  - Print a gorgeous, interactive, secure console card containing quick links and log commands.

#### [MODIFY] [docker.md](file:///d:/ACHME_COMUNICATION/docker.md)
* Rewrite the guide completely to explain Nginx and the isolated network.
* Add beginners explanations of *each* Dockerfile, the Compose structure, and how Nginx acts as the secure reverse proxy.
* Outline specific guides on how to build, run, stop, update code, rebuild, and inspect container logs.

---

## Verification Plan

### Automated/Local Scripts
* Run the Windows launcher `docker.bat` and ensure:
  1. The environment is verified.
  2. The four services successfully build and spin up in detached mode.
  3. Polling checks for database, backend, and Nginx pass successfully.

### Manual Verification
* Access `http://localhost` (port 80) and verify that:
  - The React frontend dashboard loads cleanly.
  - Login works, fetching APIs from `/api/auth/login` through Nginx.
  - Sockets load, establishing a real-time connection to `/socket.io/` via Nginx.
* Check container status:
  - `docker ps` shows all four containers (`achme-mysql`, `achme-backend`, `achme-frontend`, `achme-nginx`) reporting `healthy`.
