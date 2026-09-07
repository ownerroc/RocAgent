// Test Scaleway SDK Client
import { createClient } from "@scaleway/sdk-client";

const client = createClient({
  accessKey: process.env.SCW_ACCESS_KEY || "SCW2CHAG3KAMSATFRRJE",
  secretKey: process.env.SCW_SECRET_KEY || "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  defaultProjectId: process.env.SCW_DEFAULT_PROJECT_ID || "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  defaultOrganizationId: process.env.SCW_DEFAULT_ORGANIZATION_ID || "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
});

console.log("✅ Scaleway client created successfully!");
console.log("Client:", JSON.stringify(client, (key, value) => {
  if (typeof value === 'function') return '[Function]';
  return value;
}, 2));