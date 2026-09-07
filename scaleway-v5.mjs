// Hardcoded config for testing
const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("=== SCALEWAY SDK TEST v5 (Using Client) ===\n");

// Dynamic import for ESM
const sdk = await import("@scaleway/sdk");

// Check for Client
console.log("Looking for Client...");
const { Client } = sdk;
console.log("Client:", typeof Client);

// Try creating a client
console.log("\n--- Creating Client ---");
try {
  const client = new Client(config);
  console.log("Client created:", client);
  console.log("client.accessKey:", client.accessKey);
  console.log("client.secretKey:", client.secretKey?.slice(0, 10) + "...");
  console.log("client.organizationId:", client.organizationId);
  console.log("client.defaultRegion:", client.defaultRegion);
  console.log("client.defaultOrganizationId:", client.defaultOrganizationId);
} catch (e) {
  console.log("Client Error:", e.message);
}

// Try using the API with client
console.log("\n--- Test 1: Account API - List Projects ---");
try {
  const { Accountv3, Client } = await import("@scaleway/sdk");
  const client = new Client(config);
  const accountApi = new Accountv3.ProjectAPI(client);
  console.log("AccountAPI created");
  const projects = await accountApi.listProjects();
  console.log("Projects:", JSON.stringify(projects.data, null, 2));
} catch (e) {
  console.log("Error:", e.message);
}

// Test 2: RDB API
console.log("\n--- Test 2: RDB API - List Instances ---");
try {
  const { Rdbv1, Client } = await import("@scaleway/sdk");
  const client = new Client({ ...config, region: "fr-par" });
  const rdbApi = new Rdbv1.API(client);
  console.log("RdbAPI created");
  const instances = await rdbApi.listInstances();
  console.log("RDB Instances:", JSON.stringify(instances.data, null, 2));
} catch (e) {
  console.log("Error:", e.message);
}

console.log("\n=== DONE ===");