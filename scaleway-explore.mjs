// Explore SDK structure
import * as sdk from '@scaleway/sdk';

console.log("=== SDK Structure ===");
console.log("Top-level exports:", Object.keys(sdk));

// Check Account versions
console.log("\n--- Account APIs ---");
console.log("Accountv1:", Object.keys(sdk.Accountv1 || {}));
console.log("Accountv2:", Object.keys(sdk.Accountv2 || {}));
console.log("Accountv3:", Object.keys(sdk.Accountv3 || {}));

// Check RDB
console.log("\n--- RDB APIs ---");
console.log("Rdbv1:", Object.keys(sdk.Rdbv1 || {}));

// Check if there's a way to get version info
console.log("\n--- Version ---");
console.log("version:", sdk.version);