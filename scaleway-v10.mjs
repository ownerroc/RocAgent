// Scaleway SDK v10 - Using new keyword properly
import { Accountv3, Rdbv1 } from '@scaleway/sdk';

const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("=== SCALEWAY SDK v10 - Using new keyword ===\n");

// Create Account API with new
const accountApi = new Accountv3.ProjectAPI({
  accessKey: config.accessKey,
  secretKey: config.secretKey,
});

console.log("accountApi created:", accountApi);
console.log("accountApi.client:", accountApi.client);

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

console.log("rdbApi created:", rdbApi);
console.log("rdbApi.client:", rdbApi.client);

try {
  const result = await rdbApi.listInstances({ region: "fr-par" });
  console.log("Result:", JSON.stringify(result, null, 2));
} catch (e) {
  console.log("Error:", e.message);
  if (e.response) console.log("Response:", e.response.data);
}

console.log("\n=== DONE ===");