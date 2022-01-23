module.exports = {
  apps: [{
    name        : 'mpc-discordrpc',
    script      : 'dist/index.js',
    log         : 'mpc-discordrpc.log',
    output      : 'NULL',
    error       : 'NULL',
    merge_logs  : true
  }]
};
