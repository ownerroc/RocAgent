// Debug Scaleway SDK - Check client structure
import { createClient } from "@scaleway/sdk-client";
import { Rdbv1 } from "@scaleway/sdk-rdb";

const client = createClient({
  accessKey: process.env.SCW_ACCESS_KEY || "SCW2CHAG3KAMSATFRRJE",
  secretKey: process.env.SCW_SECRET_KEY || "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  defaultProjectId: process.env.SCW_DEFAULT_PROJECT_ID || "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
});

console.log("=== CLIENT DEBUG ===");
console.log("Client:", client);
console.log("Client accessKey:", client.accessKey);
console.log("Client secretKey:", client.secretKey ? "***" + client.secretKey.slice(-4) : "none");
console.log("Client defaultProjectId:", client.defaultProjectId);

// Test API creation
console.log("\n=== API TEST ===");
const rdbClient = new Rdbv1.API(client);
console.log("RDB Client:", rdbClient);
console.log("RDB Client region:", rdbClient.region);