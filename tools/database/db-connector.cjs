/**
 * Database Connector - Snowflake & Neon
 * Required: npm install snowflake-sdk pg dotenv
 */

const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath, override: true });
}

// Use local node_modules
const localNodeModules = path.join(__dirname, 'node_modules');
module.paths.unshift(localNodeModules);

// Snowflake Connector
async function getSnowflakeConnection() {
  if (!process.env.SNOWFLAKE_ACCOUNT || !process.env.SNOWFLAKE_USER || !process.env.SNOWFLAKE_PAT) {
    throw new Error('Snowflake config missing. Set SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_PAT in .env');
  }
  
  const snowflake = require('snowflake-sdk');
  const connection = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USER,
    password: process.env.SNOWFLAKE_PAT,
    database: process.env.SNOWFLAKE_DB || 'ROCAGENTINSIGHT_DB',
    schema: process.env.SNOWFLAKE_SCHEMA || 'GOVERNANCE'
  });
  
  return new Promise((resolve, reject) => {
    connection.connect((err) => {
      if (err) reject(err);
      else resolve(connection);
    });
  });
}

// Neon Connector
async function getNeonPool() {
  if (!process.env.NEON_URI) {
    throw new Error('Neon config missing. Set NEON_URI in .env');
  }
  
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.NEON_URI });
  return pool;
}

// Test Connections
async function testConnections() {
  const results = { snowflake: null, neon: null };
  
  // Test Snowflake
  try {
    const sf = await getSnowflakeConnection();
    results.snowflake = { status: 'connected', version: 'N/A' };
    sf.destroy();
  } catch (e) {
    results.snowflake = { status: 'error', message: e.message };
  }
  
  // Test Neon
  try {
    const neon = await getNeonPool();
    const client = await neon.connect();
    const res = await client.query('SELECT version()');
    results.neon = { status: 'connected', version: res.rows[0].version };
    client.release();
    await neon.end();
  } catch (e) {
    results.neon = { status: 'error', message: e.message };
  }
  
  return results;
}

module.exports = {
  getSnowflakeConnection,
  getNeonPool,
  testConnections
};

// CLI Test
if (require.main === module) {
  testConnections().then(r => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  }).catch(e => {
    console.error(e.message);
    process.exit(1);
  });
}