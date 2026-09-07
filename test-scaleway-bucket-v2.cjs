require('dotenv').config();
const crypto = require('crypto');

const SECRET_KEY = process.env.SCALEWAY_SECRET_KEY;
const ACCESS_KEY = process.env.SCALEWAY_ACCESS_KEY;
const bucketName = 'rocsystem-test-' + Date.now();
const region = 'fr-par';
const host = 's3.fr-par.scw.cloud';

const endpoint = `https://${host}/${bucketName}`;

const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
const dateStamp = amzDate.slice(0, 8);

// Scaleway uses 'scw3_request'
const service = 's3';
const credentialScope = `${dateStamp}/${region}/${service}/scw3_request`;
const credential = `${ACCESS_KEY}/${credentialScope}`;

// Canonical request
const headers = {
  'Host': host,
  'x-amz-date': amzDate,
  'x-amz-content-sha256': 'UNSIGNED-PAYLOAD'
};

const signedHeaders = Object.keys(headers).map(k => k.toLowerCase()).sort().join(';');
const canonicalHeaders = Object.entries(headers).sort((a,b) => a[0].localeCompare(b[0])).map(([k,v]) => `${k.toLowerCase()}:${v}`).join('\n') + '\n';

const canonicalRequest = [
  'PUT',
  `/${bucketName}`,
  '',
  canonicalHeaders,
  signedHeaders,
  'UNSIGNED-PAYLOAD'
].join('\n');

// String to sign
const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
const stringToSign = [
  'AWS4-HMAC-SHA256',
  amzDate,
  credentialScope,
  canonicalRequestHash
].join('\n');

// Signing key
const kDate = crypto.createHmac('sha256', 'AWS4' + SECRET_KEY).update(dateStamp).digest();
const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
const kSigning = crypto.createHmac('sha256', kService).update('scw3_request').digest();
const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

const authHeader = `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

console.log('Bucket:', bucketName);
console.log('Auth:', authHeader);

fetch(endpoint, {
  method: 'PUT',
  headers: {
    ...headers,
    'Authorization': authHeader
  }
}).then(r => r.text().then(t => console.log('Status:', r.status, 'Response:', t)));