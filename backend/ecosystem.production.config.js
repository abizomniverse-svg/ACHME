const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const logsDir = path.join(projectRoot, "logs");

module.exports = {
  apps: [{
    name: 'achme-backend',
    script: './server.js',
    cwd: path.join(projectRoot, "backend"),
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '5s',
    restart_delay: 3000,
    watch: false,
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production', PORT: 5000 },
    error_file: path.join(logsDir, 'pm2-error.log'),
    out_file: path.join(logsDir, 'pm2-out.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    time: true
  }]
};
