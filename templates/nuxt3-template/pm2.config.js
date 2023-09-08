module.exports = {
  apps: [
    {
      name: 'your app',
      exec_mode: 'cluster',
      // instances: 'max',
      script: 'node-server/server/index.mjs',
      output: './pm2-log/nitro-back-out.log',
      error: './pm2-log/nitro-back-error.log',
      env: {
        'PORT': 8099,
        'HOST': '0.0.0.0'
      },
      env_test: {
        'PORT': 8099,
        'HOST': '0.0.0.0',
        'MODE': 'dev'
      }
    }
  ]
}