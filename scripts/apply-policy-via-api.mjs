import { createHash, createSign } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import https from 'node:https';

// Use env vars set in the workspace
const account = process.env.SNOWFLAKE_ACCOUNT;
const user = process.env.SNOWFLAKE_USER;
const pat = process.env.SNOWFLAKE_PAT;

if (!account || !user || !pat) {
  console.error('Missing SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, or SNOWFLAKE_PAT');
  process.exit(1);
}

// Snowflake OAuth token endpoint
const tokenUrl = `https://${account}.snowflakecomputing.com/oauth/token`;

// Generate JWT for OAuth (HS256)
function generateJWT() {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: `${user}.${account}.SHA256:${createHash('sha256').update(pat).digest('hex').slice(0, 16)}`,
    sub: user,
    iat: now,
    exp: now + 3600,
  };
  const h = Buffer.from(JSON.stringify(header)).toString('base64url');
  const c = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const sig = createSign('sha256').update(`${h}.${c}`).sign(pat, 'base64');
  return `${h}.${c}.${sig}`;
}

const jwt = generateJWT();

// Request token
const postData = new URLSearchParams({
  grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
  assertion: jwt,
}).toString();

const req = https.request({
  hostname: `${account}.snowflakecomputing.com`,
  port: 443,
  path: '/oauth/token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
  },
}, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error('Token request failed:', res.statusCode, body);
      process.exit(1);
    }
    try {
      const { access_token } = JSON.parse(body);
      console.log('✅ Got access token');

      // Execute SQL via REST API
      const sql = `
        USE ROLE ACCOUNTADMIN;
        DROP NETWORK POLICY IF EXISTS ROCAGENT_PAT_POLICY;
        DROP NETWORK RULE IF EXISTS ROCAGENT_ALLOWED_IPS;
        ALTER USER IVANSSLO UNSET NETWORK_POLICY;
        CREATE OR REPLACE NETWORK RULE ROCAGENT_ALLOWED_IPS
          TYPE = 'IPV4'
          VALUE_LIST = ('194.15.115.25');
        CREATE OR REPLACE NETWORK POLICY ROCAGENT_PAT_POLICY
          ALLOWED_NETWORK_RULE_LIST = ('ROCAGENT_ALLOWED_IPS');
        ALTER USER IVANSSLO SET NETWORK_POLICY = ROCAGENT_PAT_POLICY;
        SHOW NETWORK POLICIES;
        SHOW NETWORK RULES;
        DESC USER IVANSSLO;
      `;

      const execBody = JSON.stringify({ sql });
      const execReq = https.request({
        hostname: `${account}.snowflakecomputing.com`,
        port: 443,
        path: '/api/v2/statements',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(execBody),
        },
      }, (execRes) => {
        let execData = '';
        execRes.on('data', (chunk) => { execData += chunk; });
        execRes.on('end', () => {
          if (execRes.statusCode !== 200) {
            console.error('Execute failed:', execRes.statusCode, execData);
            process.exit(1);
          }
          try {
            const { result } = JSON.parse(execData);
            console.log('✅ Policy applied. Results:', result);
          } catch (e) {
            console.error('Failed to parse execute result:', e);
            process.exit(1);
          }
        });
      });

      execReq.on('error', (e) => {
        console.error('Execute request error:', e);
        process.exit(1);
      });
      execReq.write(execBody);
      execReq.end();
    } catch (e) {
      console.error('Token parsing error:', e);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Token request error:', e);
  process.exit(1);
});
req.write(postData);
req.end();
