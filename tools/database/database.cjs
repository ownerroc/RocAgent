/**
 * Database Tools - All-in-one Connector & Query
 * Required: npm install dotenv pg snowflake-sdk
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

// ==========================================
// NEON CONNECTOR
// ==========================================
async function getNeonPool() {
  if (!process.env.NEON_URI) {
    throw new Error('Neon config missing. Set NEON_URI in .env');
  }
  
  const { Pool } = require('pg');
  const pool = new Pool({ 
    connectionString: process.env.NEON_URI,
    ssl: { rejectUnauthorized: false }
  });
  return pool;
}

async function queryNeon(sql) {
  if (!sql) {
    throw new Error('SQL required. Usage: node database.cjs "SELECT * FROM users LIMIT 10"');
  }

  const pool = await getNeonPool();
  const client = await pool.connect();
  
  try {
    const res = await client.query(sql);
    return { 
      rows: res.rows, 
      rowCount: res.rowCount,
      fields: res.fields.map(f => f.name)
    };
  } finally {
    client.release();
    await pool.end();
  }
}

// ==========================================
// SNOWFLAKE CONNECTOR
// ==========================================
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

async function querySnowflake(naturalQuestion) {
  if (!naturalQuestion) {
    throw new Error('Question required. Usage: node database.cjs --snowflake "Your question"');
  }

  const connection = await getSnowflakeConnection();
  const db = process.env.SNOWFLAKE_DB || 'ROCAGENTINSIGHT_DB';
  const schema = process.env.SNOWFLAKE_SCHEMA || 'GOVERNANCE';

  // For now, return a sample query - in production, use Cortex
  const sql = `SELECT * FROM ${db}.${schema}.TOOL_EXECUTIONS LIMIT 10`;

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      complete: (err, stmt, rows) => {
        connection.destroy();
        if (err) reject(err);
        else resolve({ 
          question: naturalQuestion, 
          sql: sql,
          rows: rows,
          rowCount: rows?.length || 0
        });
      }
    });
  });
}

// Test Connections
async function testConnections() {
  const results = { snowflake: null, neon: null };
  
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
  
  // Test Snowflake
  try {
    await getSnowflakeConnection();
    results.snowflake = { status: 'configured', message: 'Credentials present' };
  } catch (e) {
    results.snowflake = { status: 'error', message: e.message };
  }
  
  return results;
}

// ==========================================
// CLI
// ==========================================
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--test') {
    testConnections().then(r => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(0);
    }).catch(e => {
      console.error(e.message);
      process.exit(1);
    });
  } else if (args[0] === '--snowflake') {
    const question = args.slice(1).join(' ');
    querySnowflake(question).then(r => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(0);
    }).catch(e => {
      console.error(e.message);
      process.exit(1);
    });
  } else {
    // Default: Neon query
    const sql = args.join(' ');
    if (!sql) {
      console.log(`
Database Tools Usage:
  node database.cjs --test                         # Test koneksi
  node database.cjs "SELECT * FROM users"         # Query Neon
  node database.cjs --snowflake "question?"       # Query Snowflake (natural language)
      `.trim());
      process.exit(0);
    }
    
    queryNeon(sql).then(r => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(0);
    }).catch(e => {
      console.error(e.message);
      process.exit(1);
    });
  }
}

module.exports = {
  getNeonPool,
  getSnowflakeConnection,
  queryNeon,
  querySnowflake,
  testConnections
};