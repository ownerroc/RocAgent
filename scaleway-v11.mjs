// Scaleway SDK v11 - Debug client initialization
import { Accountv3, Rdbv1 } from '@scaleway/sdk';

const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("=== SCALEWAY SDK v11 - Debug Client ===\n");

// Create Account API
const accountApi = new Accountv3.ProjectAPI({
  accessKey: config.accessKey,
  secretKey: config.secretKey,
});

// Manually set the missing properties
accountApi.client.defaultOrganizationId = config.organizationId;
accountApi.client.defaultPageSize = 10;

console.log("After setting defaults:");
console.log("client:", accountApi.client);

// Try calling listProjects
console.log("\n--- Test: listProjects ---");
try {
  const result = await accountApi.listProjects();
  console.log("Result:", JSON.stringify(result, null, 2));
} catch (e) {
  console.log("Error:", e.message);
  if (e.response) console.log("Response:", e.response.data);
}

// Try RDB
console.log("\n--- Test: RDB listInstances ---");
const rdbApi = new Rdbv1.API({
  accessKey: config.accessKey,
  secretKey: config.secretKey,
});

// Set required properties
rdbApi.client.defaultRegion = "fr-par";
rdbApi.client.defaultProjectId = config.projectId;
rdbApi.client.defaultPageSize = 10;

console.log("RDB client after setting defaults:", rdbApi.client);

try {
  const result = await rdbApi.listInstances();
  console.log("Result:", JSON.stringify(result, null, 2));
} catch (e) {
  console.log("Error:", e.message);
  if (e.response) console.log("Response:", e.response.data);
}

console.log("\n=== DONE ===");