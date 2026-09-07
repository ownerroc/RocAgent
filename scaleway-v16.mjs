// Scaleway SDK v16 - Fixed constructor names
import * as scw from '@scaleway/sdk';

const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("=== SCALEWAY SDK v16 - Testing ===\n");

(async () => {
  // Test Account API - use ProjectAPI
  console.log("--- Test: Account ProjectAPI ---");
  try {
    const accountApi = new scw.Accountv3.ProjectAPI({
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    
    const result = await accountApi.listProjects({
      organizationId: config.organizationId,
    });
    
    console.log("Projects:", JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.log("Error:", e.message);
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
  }

  // Test Object Storage
  console.log("\n--- Test: Object Storage ---");
  try {
    // Use the S3 module if available
    const s3Module = scw.S3;
    console.log("S3 module:", typeof s3Module);
    
    if (s3Module) {
      const s3 = new s3Module({
        accessKey: config.accessKey,
        secretKey: config.secretKey,
      });
      
      const result = await s3.listBuckets({ region: "fr-par" });
      console.log("Buckets:", JSON.stringify(result, null, 2));
    }
  } catch (e) {
    console.log("Error:", e.message);
  }

  // Test Inference (AI) if available
  console.log("\n--- Test: Inference API ---");
  try {
    const inferenceApi = new scw.Inferencev1.API({
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    
    const result = await inferenceApi.listEndpoints({
      region: "fr-par",
    });
    
    console.log("Inference Endpoints:", JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.log("Error:", e.message);
  }

  console.log("\n=== DONE ===");
})();