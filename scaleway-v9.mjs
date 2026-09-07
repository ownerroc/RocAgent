// Scaleway SDK v9 - Using createClient
import * as sdk from '@scaleway/sdk';

const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("=== SCALEWAY SDK v9 - Using createClient ===\n");

// Try using createClient
console.log("--- createClient function ---");
console.log("createClient:", typeof sdk.createClient);
console.log("createClient keys:", sdk.createClient ? Object.keys(sdk.createClient) : "N/A");

// Try using createAdvancedClient
console.log("\n--- createAdvancedClient function ---");
console.log("createAdvancedClient:", typeof sdk.createAdvancedClient);

// Try to understand how to properly initialize
console.log("\n--- Try different initialization ---");

// Method 1: Pass organizationId in config
try {
  const accountApi1 = sdk.Accountv3.ProjectAPI({
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    organizationId: config.organizationId,
  });
  console.log("Method 1 - client:", accountApi1.client);
} catch (e) {
  console.log("Method 1 Error:", e.message);
}

// Method 2: Use createClient
try {
  const client = sdk.createClient({
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
  console.log("\nMethod 2 - client type:", typeof client);
  console.log("Method 2 - client keys:", Object.keys(client));
} catch (e) {
  console.log("\nMethod 2 Error:", e.message);
}

// Method 3: Check what the API expects for organizationId
console.log("\n--- Check API signature ---");
const accountApi = sdk.Accountv3.ProjectAPI({
  accessKey: config.accessKey,
  secretKey: config.secretKey,
});

// Check listProjects function
console.log("listProjects:", accountApi.listProjects.toString().slice(0, 500));

console.log("\n=== DONE ===");