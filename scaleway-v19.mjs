// Inspect SDK client methods
import * as scw from '@scaleway/sdk';

const rdbApi = new scw.Rdbv1.API({
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
});

console.log("=== All client properties ===");
for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(rdbApi.client))) {
  console.log("method:", key);
}

console.log("\n=== Try calling listInstances directly ===");
try {
  const result = rdbApi.listInstances({
    region: "fr-par",
    projectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  });
  console.log("Result type:", typeof result);
  console.log("Result:", result);
} catch (e) {
  console.log("Error:", e.message);
}