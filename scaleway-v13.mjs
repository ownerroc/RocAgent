// Scaleway SDK v13 - Check SDK client module
import * as scwClient from '@scaleway/sdk-client';

const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("=== SCALEWAY SDK v13 - Check SDK Client ===\n");

// Check what's available
console.log("scwClient exports:", Object.keys(scwClient));

// Check createClient
if (scwClient.createClient) {
  console.log("\n--- Using createClient ---");
  const client = scwClient.createClient({
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
  console.log("Client:", client);
  console.log("Client keys:", Object.keys(client));
}

console.log("\n=== DONE ===");