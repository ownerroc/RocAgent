// Scaleway SDK v17 - Using createClient properly
import * as scw from '@scaleway/sdk';

const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("=== SCALEWAY SDK v17 - Using createClient ===\n");

// Check what's in createClient
console.log("scw.createClient:", typeof scw.createClient);
console.log("scw.createClient keys:", Object.keys(scw.createClient || {}));

// Try to create client
let baseClient;
try {
  baseClient = scw.createClient({
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
  console.log("\nBase client created successfully");
  console.log("Base client type:", typeof baseClient);
  console.log("Base client keys:", Object.keys(baseClient).slice(0, 10));
} catch (e) {
  console.log("Error creating client:", e.message);
}

console.log("\n=== DONE ===");