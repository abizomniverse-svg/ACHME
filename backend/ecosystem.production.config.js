module.exports = {
  apps: [{
    name: 'achme-backend',
    script: './server.js',
    cwd: 'D:\\ACHME_COMUNICATION-main\\backend',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '5s',
    restart_delay: 3000,
    watch: false,
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production', PORT: 5000 },
    error_file: 'D:\\ACHME_COMUNICATION-main\\logs\\pm2-error.log',
    out_file: 'D:\\ACHME_COMUNICATION-main\\logs\\pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    time: true
  }]
};
