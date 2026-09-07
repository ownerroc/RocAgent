import * as account from "@scaleway/sdk-account";
import * as rdb from "@scaleway/sdk-rdb";

console.log("Accountv3:", typeof account.Accountv3);
console.log("Rdbv1:", typeof rdb.Rdbv1);

// Try to see what they are
console.log("\nAccountv3 keys:", Object.keys(account.Accountv3 || {}));
console.log("Rdbv1 keys:", Object.keys(rdb.Rdbv1 || {}));