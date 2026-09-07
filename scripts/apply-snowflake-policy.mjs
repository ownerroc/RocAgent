import snowflake from 'snowflake-sdk';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Use env vars set in the workspace
const account = process.env.SNOWFLAKE_ACCOUNT;
const user = process.env.SNOWFLAKE_USER;
const password = process.env.SNOWFLAKE_PASSWORD;
const pat = process.env.SNOWFLAKE_PAT;

if (!account || !user || (!password && !pat)) {
  console.error('Missing Snowflake credentials in env');
  process.exit(1);
}

// Create connection using PAT if available, else password
let connection = {
  account,
  username: user,
  application: 'ROCAGENT_POLICY_APPLIER',
};

if (pat) {
  connection = { ...connection, authenticator: 'SNOWFLAKE_JWT', privateKey: pat };
} else {
  connection = { ...connection, password };
}

const conn = snowflake.createConnection(connection);

async function applyPolicy() {
  try {
    await new Promise((resolve, reject) => {
      conn.connect((err) => {
        if (err) { console.error('Connect failed', err); reject(err); }
        else resolve();
      });
    });

    // Drop existing policy/rule if any
    const dropRules = [
      'DROP NETWORK RULE IF EXISTS ROCAGENT_ALLOWED_IPS;',
      'DROP NETWORK POLICY IF EXISTS ROCAGENT_PAT_POLICY;',
    ];

    for (const sql of dropRules) {
      await new Promise((resolve, reject) => {
        conn.execute({ sql, complete: (err) => (err ? reject(err) : resolve()) });
      });
    }

    // Detect current outbound IP
    const { execSync } = await import('child_process');
    const ipOutput = execSync("ip addr show | grep -E 'inet (10\\.|172\\.|192\\.)' | grep -v ': ' | head -1 | awk '{print \\$2}' | cut -d'/' -f1", { encoding: 'utf8' }).trim();
    const currentIP = ipOutput || '10.44.193.120';
    console.log(`📍 Current outbound IP: ${currentIP}`);

    // Create network rule for the current IP
    const createRule = `
      CREATE OR REPLACE NETWORK RULE ROCAGENT_ALLOWED_IPS
        TYPE = 'IPV4'
        VALUE_LIST = ('${currentIP}');
    `;
    await new Promise((resolve, reject) => {
      conn.execute({ sql: createRule, complete: (err) => (err ? reject(err) : resolve()) });
    });

    // Create network policy using the rule
    const createPolicy = `
      CREATE OR REPLACE NETWORK POLICY ROCAGENT_PAT_POLICY
        ALLOWED_NETWORK_RULE_LIST = ('ROCAGENT_ALLOWED_IPS');
    `;
    await new Promise((resolve, reject) => {
      conn.execute({ sql: createPolicy, complete: (err) => (err ? reject(err) : resolve()) });
    });

    // Assign policy to the user
    const assignPolicy = `ALTER USER ${user} SET NETWORK_POLICY = ROCAGENT_PAT_POLICY;`;
    await new Promise((resolve, reject) => {
      conn.execute({ sql: assignPolicy, complete: (err) => (err ? reject(err) : resolve()) });
    });

    // Verify
    const verifies = [
      'SHOW NETWORK POLICIES;',
      'SHOW NETWORK RULES;',
      `DESC USER ${user};`,
    ];

    for (const sql of verifies) {
      await new Promise((resolve, reject) => {
        conn.execute({ sql, complete: (err, stmt) => {
          if (err) reject(err);
          else { console.log(sql); console.table(stmt.getRows()); resolve(); }
        } });
      });
    }

    console.log('✅ Snowflake network policy applied successfully.');
  } catch (err) {
    console.error('❌ Failed to apply policy:', err);
    process.exit(1);
  } finally {
    conn.destroy();
  }
}

applyPolicy();
