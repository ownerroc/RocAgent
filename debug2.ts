// Debug - Check how to properly initialize client
import { createClient } from "@scaleway/sdk-client";

const client = createClient({
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  defaultProjectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
});

console.log("=== CLIENT TEST ===");
console.log("Client keys:", Object.keys(client));
console.log("Settings:", client.settings);
console.log("AccessKey in settings:", client.settings.defaultProjectId);