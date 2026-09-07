/**
 * Query Neon - Direct SQL to Neon Postgres
 */

const { getNeonPool } = require('./db-connector');

async function queryNeon(sql) {
  if (!sql) {
    throw new Error('SQL required. Usage: node query-neon.js "SELECT * FROM users LIMIT 10"');
  }

  const pool = await getNeonPool();
  const client = await pool.connect();
  
  try {
    const res = await client.query(sql);
    return { 
      rows: res.rows, 
      rowCount: res.rowCount,
      fields: res.fields 
    };
  } finally {
    client.release();
    await pool.end();
  }
}

// CLI
if (require.main === module) {
  const sql = process.argv.slice(2).join(' ');
  if (!sql) {
    console.log('Usage: node query-neon.js "SELECT * FROM users LIMIT 10"');
    process.exit(1);
  }
  
  queryNeon(sql)
    .then(r => console.log(JSON.stringify(r, null, 2)))
    .catch(e => { console.error(e.message); process.exit(1); });
}

module.exports = { queryNeon };