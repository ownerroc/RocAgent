// Debug: Check what SDK exports and test
import * as rdb from "@scaleway/sdk-rdb";
import { createClient } from "@scaleway/sdk-client";

console.log("RDB exports:", Object.keys(rdb));
console.log("v1 exists:", !!rdb.v1);

// Try using the v1 API
try {
  const client = createClient({
    accessKey: "SCW2CHAG3KAMSATFRRJE",
    secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
    defaultProjectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
  });
  
  const rdbApi = rdb.v1.API;
  console.log("RDB API class:", typeof rdbApi);
  
  if (rdbApi) {
    const rdbClient = new rdbApi(client);
    console.log("RDB Client created:", !!rdbClient);
    console.log("RDB Client methods:", Object.keys(rdbClient).slice(0, 10));
  }
} catch (e) {
  console.error("Error:", e);
}