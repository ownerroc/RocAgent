// Inspect Scaleway SDK - deeper look
import * as scw from '@scaleway/sdk';

console.log("=== Checking SDK Structure ===\n");

// Check Accountv3
console.log("Accountv3:", typeof scw.Accountv3);
console.log("Accountv3 keys:", Object.keys(scw.Accountv3).slice(0, 10));

// Check Rdbv1
console.log("\nRdbv1:", typeof scw.Rdbv1);
console.log("Rdbv1 keys:", Object.keys(scw.Rdbv1).slice(0, 10));

// Try accessing API differently
if (scw.Accountv3.API) {
  console.log("\nAccountv3.API exists:", typeof scw.Accountv3.API);
} else if (scw.Accountv3.api) {
  console.log("\nAccountv3.api exists:", typeof scw.Accountv3.api);
}

if (scw.Rdbv1.API) {
  console.log("Rdbv1.API exists:", typeof scw.Rdbv1.API);
} else if (scw.Rdbv1.api) {
  console.log("Rdbv1.api exists:", typeof scw.Rdbv1.api);
}