// Scaleway SDK v15 - Proper usage
import * as scw from '@scaleway/sdk';

const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("=== SCALEWAY SDK v15 - Testing ===\n");

// Test Account API
console.log("--- Test: Account API ---");
(async () => {
  try {
    const accountApi = new scw.Accountv3.API({
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    
    const result = await accountApi.listProjects({
      organizationId: config.organizationId,
    });
    
    console.log("Projects:", JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.log("Error:", e.message);
    if (e.response) console.log("Response:", JSON.stringify(e.response.data, null, 2));
  }

  // Test RDB API
  console.log("\n--- Test: RDB API ---");
  try {
    const rdbApi = new scw.Rdbv1.API({
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    
    const result = await rdbApi.listInstances({
      region: "fr-par",
      projectId: config.projectId,
    });
    
    console.log("RDB Instances:", JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.log("Error:", e.message);
    if (e.response) console.log("Response:", JSON.stringify(e.response.data, null, 2));
  }

  // Test Object Storage (S3)
  console.log("\n--- Test: Object Storage (S3) ---");
  try {
    const s3 = new scw.S3({    accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    
    // List buckets
    const result = await s3.listBuckets({ region: "fr-par" });
    console.log("Buckets:", JSON.stringify(result.Buckets || [], null, 2));
  } catch (e) {
    console.log("Error:", e.message);
    if (e.response) console.log("Response:", JSON.stringify(e.response.data, null, 2));
  }

  console.log("\n=== DONE ===");
})();