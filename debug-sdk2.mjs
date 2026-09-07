import { Accountv3, Rdbv1 } from "@scaleway/sdk";

console.log("Accountv3.ProjectAPI:", typeof Accountv3.ProjectAPI);
console.log("Rdbv1.API:", typeof Rdbv1.API);

// Try instantiating the API classes
const config = {
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  organizationId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
};

console.log("\n--- Testing with API class ---");

// Test Account
try {
  const projectApi = new Accountv3.ProjectAPI(config);
  console.log("ProjectAPI created");
  const projects = await projectApi.listProjects({});
  console.log("Projects:", projects.data);
} catch (e) {
  console.log("Error:", e.message);
}