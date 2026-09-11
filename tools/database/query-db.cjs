#!/usr/bin/env node
/**
 * Unified database query tool for Neon (Postgres) and Snowflake.
 * Usage: node query-db.cjs --db neon|snowflake "SQL QUERY HERE"
 */

const { Client: PgClient } = require('pg');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function showUsage() {
  console.log(`
Usage:
  node query-db.cjs --db neon|snowflake "SQL QUERY HERE"

Examples:
  node query-db.cjs --db neon "SELECT * FROM users LIMIT 10;"
  node query-db.cjs --db snowflake "SHOW TABLES;"
`);
  process.exit(1);
}

function error(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function getNeonUri() {
  return process.env.NEON_URI || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
}

function getSnowflakeConfig() {
  const account = process.env.SNOWFLAKE_ACCOUNT || '';
  const user = process.env.SNOWFLAKE_USER || '';
  const pat = process.env.SNOWFLAKE_PAT || process.env.SNOWFLAKE_KEY || '';
  if (!account || !user || !pat) {
    error('Snowflake belum dikonfigurasi. Set SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, dan SNOWFLAKE_PAT (atau SNOWFLAKE_KEY) di cloud.env.');
  }
  return { account, user, pat };
}

async function queryNeon(sql) {
  const uri = getNeonUri();
  if (!uri) error('Neon belum dikonfigurasi. Set NEON_URI (connection string lengkap dari Neon console, termasuk sslmode=require) di cloud.env.');

  const client = new PgClient({ connectionString: uri, connectionTimeoutMillis: 10000, query_timeout: 20000 });
  try {
    await client.connect();
    const result = await client.query(sql);
    console.log(JSON.stringify({ status: 'success', command: result.command, rowCount: result.rowCount, fields: (result.fields || []).map(f => f.name), rows: result.rows }, null, 2));
  } finally {
    await client.end().catch(() => {});
  }
}

async function querySnowflake(sql) {
  const { account, user, pat } = getSnowflakeConfig();
  const host = `https://${account}.snowflakecomputing.com`;
  const url = `${host}/api/v2/statements`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
        'X-Snowflake-Authorization-Token-Type': 'PROGRAMMATIC_ACCESS_TOKEN',
      },
      body: JSON.stringify({ statement: sql, timeout: 45 }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const raw = await resp.text();
    if (!resp.ok) {
      console.error(JSON.stringify({ status: 'error', httpStatus: resp.status, body: raw.slice(0, 500) }, null, 2));
      process.exit(1);
    }

    let finalText = '';
    for (const line of raw.split('\n')) {
      if (line.startsWith('event:') && line.includes('response.text.delta')) {
        const data = line.split('data:')[1]?.trim();
        if (data) finalText += JSON.parse(data).text || '';
      }
    }

    console.log(JSON.stringify({ status: 'success', answer: finalText || '(Agent tidak mengembalikan teks jawaban)', raw_response: raw.length > 12000 ? raw.slice(0, 12000) + '...(truncated)' : raw }, null, 2));
  } catch (err) {
    clearTimeout(timer);
    console.error(JSON.stringify({ status: 'error', message: err?.message || String(err) }, null, 2));
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const dbIdx = args.findIndex(a => a === '--db');
  if (dbIdx === -1 || dbIdx + 1 >= args.length) showUsage();

  const db = args[dbIdx + 1];
  const sql = args.slice(dbIdx + 2).join(' ').trim();
  if (!sql) showUsage();

  if (db === 'neon') {
    queryNeon(sql).catch(err => error(err.message));
  } else if (db === 'snowflake') {
    querySnowflake(sql).catch(err => error(err.message));
  } else {
    error("Parameter --db harus 'neon' atau 'snowflake'.");
  }
}

main();
