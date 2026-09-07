// Test Scaleway SDK - Fixed
import { createClient } from "@scaleway/sdk-client";
import { Rdbv1 } from "@scaleway/sdk-rdb";

const client = createClient({
  accessKey: process.env.SCW_ACCESS_KEY || "SCW2CHAG3KAMSATFRRJE",
  secretKey: process.env.SCW_SECRET_KEY || "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  defaultProjectId: process.env.SCW_DEFAULT_PROJECT_ID || "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  defaultRegion: "fr-par",
  defaultZone: "fr-par-1",
});

async function main() {
  console.log("=== SCALEWAY SDK TEST ===\n");
  
  // Test RDB
  console.log("1. Testing RDB (Database)...");
  try {
    const rdbClient = new Rdbv1.API(client);
    const instances = await rdbClient.listInstances({ region: "fr-par" });
    console.log("   ✅ RDB Connected! Total instances:", instances.total_count);
    if (instances.instances) {
      console.log("   Instances:", JSON.stringify(instances.instances, null, 2));
    }
  } catch (e: any) {
    console.log("   ❌ RDB Error:", e.message || e.code || e);
  }

  console.log("\n=== TEST COMPLETE ===");
}

main();