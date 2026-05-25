const path = require("path");

const projectRoot = process.env.ACHME_PROJECT_DIR || "/opt/achme";
const logsDir = path.join(projectRoot, "logs");

module.exports = {
  apps: [{
    name: 'achme-backend',
    script: path.join(projectRoot, "backend", "server.js"),
    cwd: path.join(projectRoot, "backend"),
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    max_restarts: 15,
    min_uptime: '10s',
    restart_delay: 3000,
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DB_HOST: '127.0.0.1'
    },
    error_file: path.join(logsDir, 'backend-error.log'),
    out_file: path.join(logsDir, 'backend-out.log'),
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    time: true
  }]
};
