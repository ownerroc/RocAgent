import { Accountv3, Rdbv1 } from "@scaleway/sdk";

const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  region: "fr-par",
};

console.log("🔧 Testing Scaleway SDK...\n");

// Test 1: Account API
console.log("1️⃣ Account API (list projects)...");
try {
  const projectApi = new Accountv3.ProjectAPI(config);
  const projects = await projectApi.listProjects({});
  console.log("   ✅ Projects:", projects.data.items?.length || 0);
} catch (e) {
  console.log("   ❌ Error:", e.message);
}

// Test 2: RDB API
console.log("\n2️⃣ RDB API (list instances)...");
try {
  const rdbApi = new Rdbv1.API(config);
  const instances = await rdbApi.listInstances({});
  console.log("   ✅ RDB Instances:", instances.data.instances?.length || 0);
} catch (e) {
  console.log("   ❌ Error:", e.message);
}

console.log("\n✅ SDK Test Complete!");
