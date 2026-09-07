// Scaleway SDK v12 - Check internal API client
import { Accountv3, Rdbv1, createClient } from '@scaleway/sdk';

const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("=== SCALEWAY SDK v12 - Check createClient ===\n");

// Check if createClient exists
console.log("createClient:", typeof createClient);
console.log("createClient:", createClient);

// Try using createClient
try {
  const client = createClient({
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    organizationId: config.organizationId,
  });
  console.log("Client created:", client);
  console.log("Client keys:", Object.keys(client));
} catch (e) {
  console.log("Error:", e.message);
}

console.log("\n=== DONE ===");