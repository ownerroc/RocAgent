// Scaleway SDK v7 - Working Test
import * as sdk from '@scaleway/sdk';

const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("=== SCALEWAY SDK v7 TEST ===\n");

// Test 1: Account API - List Projects
console.log("--- Test 1: Account API - List Projects ---");
try {
  const accountApi = new sdk.Accountv3.ProjectAPI({
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
  
  // Set organization ID manually
  accountApi.client.defaultOrganizationId = config.organizationId;
  
  const projects = await accountApi.listProjects();
  console.log("Projects:", JSON.stringify(projects.data, null, 2));
} catch (e) {
  console.log("Error:", e.message);
  if (e.response) console.log("Response:", e.response.data);
}

// Test 2: RDB API - List Instances
console.log("\n--- Test 2: RDB API - List Instances ---");
try {
  const rdbApi = new sdk.Rdbv1.API({
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
  
  // Set region and project ID
  rdbApi.client.defaultRegion = "fr-par";
  rdbApi.client.defaultProjectId = config.projectId;
  
  const instances = await rdbApi.listInstances();
  console.log("Instances:", JSON.stringify(instances.data, null, 2));
} catch (e) {
  console.log("Error:", e.message);
  if (e.response) console.log("Response:", e.response.data);
}

// Test 3: Object Storage (S3)
console.log("\n--- Test 3: Object Storage - List Buckets ---");
try {
  // Use the generic API client for S3
  const s3Api = new sdk.S3t1.API({
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
  
  s3Api.client.defaultRegion = "fr-par";
  
  const buckets = await s3Api.listBuckets();
  console.log("Buckets:", JSON.stringify(buckets.data, null, 2));
} catch (e) {
  console.log("Error:", e.message);
  if (e.response) console.log("Response:", e.response.data);
}

console.log("\n=== DONE ===");