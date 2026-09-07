// Scaleway SDK v14 - Working with createClient
import * as scwClient from '@scaleway/sdk-client';
import { Accountv3, Rdbv1 } from '@scaleway/sdk';

const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("=== SCALEWAY SDK v14 - Working ===\n");

// Create base client
const baseClient = scwClient.createClient({
  accessKey: config.accessKey,
  secretKey: config.secretKey,
});

console.log("Base client created");

// Now try to use Account API with the base client
console.log("\n--- Test: Account API ---");
try {
  const accountApi = new Accountv3.ProjectAPI({
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
  
  // Override the internal fetch
  accountApi.client.fetch = baseClient.fetch;
  
  // Set organization ID
  accountApi.client.defaultOrganizationId = config.organizationId;
  accountApi.client.defaultPageSize = 10;
  
  const result = await accountApi.listProjects();
  console.log("Projects:", JSON.stringify(result.data, null, 2));
} catch (e) {
  console.log("Error:", e.message);
  if (e.response) console.log("Response:", e.response.data);
}

// Test RDB
console.log("\n--- Test: RDB API ---");
try {
  const rdbApi = new Rdbv1.API({
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
  
  // Override the internal fetch
  rdbApi.client.fetch = baseClient.fetch;
  
  // Set required properties
  rdbApi.client.defaultRegion = "fr-par";
  rdbApi.client.defaultProjectId = config.projectId;
  rdbApi.client.defaultPageSize = 10;
  
  const result = await rdbApi.listInstances();
  console.log("Instances:", JSON.stringify(result.data, null, 2));
} catch (e) {
  console.log("Error:", e.message);
  if (e.response) console.log("Response:", e.response.data);
}

console.log("\n=== DONE ===");