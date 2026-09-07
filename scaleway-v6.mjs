// Hardcoded config for testing
const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("=== SCALEWAY SDK TEST v6 (Raw SDK Client) ===\n");

// Try importing the client directly
console.log("--- Importing SDK Client ---");
const scwClient = await import("@scaleway/sdk-client");
console.log("sdk-client keys:", Object.keys(scwClient));

// Check default export
if (scwClient.default) {
  console.log("default:", typeof scwClient.default);
  console.log("default keys:", Object.keys(scwClient.default));
}

// Try the full SDK with different approach
console.log("\n--- Testing with different config structure ---");
const sdk = await import("@scaleway/sdk");
const { Accountv3, Rdbv1 } = sdk;

// Check what the API classes expect
console.log("\nAccountv3.ProjectAPI:", Accountv3.ProjectAPI);
console.log("Rdbv1.API:", Rdbv1.API);

// Try creating API with raw object that has all needed props
console.log("\n--- Test: Check what API expects ---");
const testApi = new Accountv3.ProjectAPI({
  accessKey: config.accessKey,
  secretKey: config.secretKey,
  organizationId: config.organizationId,
  projectId: config.projectId,
});
console.log("testApi:", testApi);
console.log("testApi.client:", testApi.client);
console.log("testApi.client.accessKey:", testApi.client?.accessKey);

// Check if we can set defaults manually
console.log("\n--- Setting defaults manually ---");
testApi.client.defaultOrganizationId = config.organizationId;
testApi.client.defaultRegion = "fr-par";
console.log("Set defaultOrganizationId:", testApi.client.defaultOrganizationId);
console.log("Set defaultRegion:", testApi.client.defaultRegion);

// Now try the call
console.log("\n--- Test 1: Account API - List Projects ---");
try {
  const projects = await testApi.listProjects();
  console.log("Projects:", JSON.stringify(projects.data, null, 2));
} catch (e) {
  console.log("Error:", e.message);
}

console.log("\n=== DONE ===");