// Inspect SDK - check v1 module
import * as scw from '@scaleway/sdk';

console.log("=== Checking v1 module ===\n");

// Check if there's a v1 module
console.log("scw.v1:", typeof scw.v1);
if (scw.v1) {
  console.log("v1 keys:", Object.keys(scw.v1).slice(0, 20));
}

// Check default export
console.log("\nscw.default:", typeof scw.default);
if (scw.default) {
  console.log("default keys:", Object.keys(scw.default).slice(0, 20));
}

// Try RDB API with proper config
console.log("\n=== Test RDB with defaults ===");
const rdbApi = new scw.Rdbv1.API({
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
});

console.log("RDB API client:", rdbApi.client ? "exists" : "missing");
if (rdbApi.client) {
  console.log("RDB API client keys:", Object.keys(rdbApi.client).slice(0, 15));
  
  // Try setting defaults manually
  rdbApi.client.defaultPageSize = 10;
  rdbApi.client.defaultRegion = "fr-par";
  
  console.log("defaultPageSize:", rdbApi.client.defaultPageSize);
  console.log("defaultRegion:", rdbApi.client.defaultRegion);
}

console.log("\n=== DONE ===");