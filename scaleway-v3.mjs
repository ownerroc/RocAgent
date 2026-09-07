// Hardcoded config for testing
const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("=== SCALEWAY SDK TEST v3 ===\n");

// Dynamic import for ESM
const { Accountv3, Rdbv1 } = await import("@scaleway/sdk");

// Get the actual class constructors from the getters
const AccountAPI = Accountv3.ProjectAPI;
const RdbAPI = Rdbv1.API;

console.log("AccountAPI type:", typeof AccountAPI);
console.log("RdbAPI type:", typeof RdbAPI);

// Test 1: Account API - List Projects
console.log("\n--- Test 1: Account API - List Projects ---");
try {
  const accountApi = new AccountAPI(config);
  console.log("AccountAPI created");
  const projects = await accountApi.listProjects();
  console.log("Projects:", JSON.stringify(projects.data, null, 2));
} catch (e) {
  console.log("Error:", e.message);
  if (e.response) console.log("Response:", e.response.data);
}

// Test 2: RDB API - List Instances
console.log("\n--- Test 2: RDB API - List Instances ---");
try {
  const rdbConfig = { ...config, region: "fr-par" };
  const rdbApi = new RdbAPI(rdbConfig);
  console.log("RdbAPI created");
  const instances = await rdbApi.listInstances();
  console.log("RDB Instances:", JSON.stringify(instances.data, null, 2));
} catch (e) {
  console.log("Error:", e.message);
  if (e.response) console.log("Response:", e.response.data);
}

console.log("\n=== DONE ===");