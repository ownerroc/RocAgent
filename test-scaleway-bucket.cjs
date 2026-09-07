const crypto = require('crypto');
require('dotenv').config();

const SECRET_KEY = process.env.SCALEWAY_SECRET_KEY;
const ACCESS_KEY = process.env.SCALEWAY_ACCESS_KEY;

const region = 'fr-par';
const bucketName = 'rocsystem-test-' + Date.now();

// AWS Signature V4 for Scaleway
const service = 's3';
const host = 's3.fr-par.scw.cloud';
const endpoint = `https://${host}/${bucketName}`;

const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8);
const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
const credential = `${ACCESS_KEY}/${date}/${region}/${service}/aws4_request`;

const headers = {
  'x-amz-date': amzDate,
  'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
  'Host': host
};

const signedHeaders = Object.keys(headers).sort().join(';');
const canonicalHeaders = Object.entries(headers).sort((a,b) => a[0].localeCompare(b[0])).map(([k,v]) => `${k.toLowerCase()}:${v}`).join('\n') + '\n';

const canonicalRequest = [
  'PUT',
  `/${bucketName}`,
  '',
  canonicalHeaders,
  signedHeaders,
  'UNSIGNED-PAYLOAD'
].join('\n');

const stringToSign = [
  'AWS4-HMAC-SHA256',
  amzDate,
  `${date}/${region}/${service}/aws4_request`,
  crypto.createHash('sha256').update(canonicalRequest).digest('hex')
].join('\n');

const getSignatureKey = (key, dateStamp, regionName, serviceName) => {
  const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
  return crypto.createHmac('sha256', kService).update('aws4_request').digest();
};

const signature = crypto.createHmac('sha256', getSignatureKey(SECRET_KEY, date, region, service)).update(stringToSign).digest('hex');

headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

console.log('Creating bucket:', bucketName);
console.log('Endpoint:', endpoint);

fetch(endpoint, { method: 'PUT', headers })
  .then(r => {
    console.log('Status:', r.status);
    return r.text();
  })
  .then(t => console.log('Response:', t))
  .catch(e => console.error('Error:', e.message));