// Scaleway SDK v8 - Debug API structure
import * as sdk from '@scaleway/sdk';

const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("=== SCALEWAY SDK v8 DEBUG ===\n");

// Create Account API
const accountApi = new sdk.Accountv3.ProjectAPI({
  accessKey: config.accessKey,
  secretKey: config.secretKey,
});

console.log("accountApi:", accountApi);
console.log("accountApi keys:", Object.keys(accountApi));

// Check if there's a client
console.log("\n--- Checking client ---");
console.log("accountApi.client:", accountApi.client);

// Try accessing the API directly
console.log("\n--- Checking raw API ---");
console.log("accountApi.api:", accountApi.api);

// Check what happens when we call
console.log("\n--- Try calling listProjects ---");
try {
  // The SDK might need organizationId passed in the request
  const result = await accountApi.listProjects({ organizationId: config.organizationId });
  console.log("Result:", JSON.stringify(result, null, 2));
} catch (e) {
  console.log("Error:", e.message);
  if (e.response) console.log("Response:", e.response.data);
}

console.log("\n=== DONE ===");