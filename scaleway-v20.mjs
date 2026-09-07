// Scaleway SDK v20 - Using sdk-client properly
import * as scwClient from '@scaleway/sdk-client';
import * as scw from '@scaleway/sdk';

const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("=== SCALEWAY SDK v20 ===\n");

// Create client with sdk-client
const baseClient = scwClient.createClient({
  accessKey: config.accessKey,
  secretKey: config.secretKey,
});

console.log("Base client created");

// Now combine with RDB API
const rdbApi = new scw.Rdbv1.API({
  accessKey: config.accessKey,
  secretKey: config.secretKey,
});

// Replace the fetch with our authenticated client
rdbApi.client.fetch = baseClient.fetch.bind(baseClient);

console.log("Testing RDB listInstances...");
try {
  const result = await rdbApi.listInstances({
    region: "fr-par",
    projectId: config.projectId,
  });
  console.log("Success!", JSON.stringify(result.data, null, 2));
} catch (e) {
  console.log("Error:", e.message);
  if (e.response) console.log("Response:", e.response.data);
}