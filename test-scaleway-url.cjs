const https = require('https');

const services = [
  { name: 'functions', hostname: 'functions.scaleway.com', path: '/v1/namespaces' },
  { name: 'rdb', hostname: 'api.scaleway.com', path: '/rdb/v1/regions/fr-par/instances' },
  { name: 'object', hostname: 's3.fr-par.scw.cloud', path: '/' },
  { name: 'k8s', hostname: 'api.scaleway.com', path: '/k8s/v1/clusters' },
  { name: 'registry', hostname: 'api.scaleway.com', path: '/registry/v1/namespaces' },
  { name: 'secret', hostname: 'api.scaleway.com', path: '/secret/v1/secrets' },
];

const token = '034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720';

services.forEach(svc => {
  const req = https.request({
    hostname: svc.hostname,
    port: 443,
    path: svc.path,
    method: 'GET',
    headers: {
      'X-Auth-Token': token,
      'Content-Type': 'application/json'
    }
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log(`${svc.name}: HTTP ${res.statusCode}`);
    });
  });
  req.on('error', e => console.log(`${svc.name}: ERROR - ${e.message}`));
  req.end();
});