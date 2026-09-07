// Check sdk-client vs sdk
console.log("=== Import both SDKs ===");

import('@scaleway/sdk-client').then(sdkClient => {
  console.log("@scaleway/sdk-client exports:", Object.keys(sdkClient).slice(0, 15));
  
  // Try createClient from sdk-client
  if (sdkClient.createClient) {
    console.log("\nCreating client with sdk-client...");
    const client = sdkClient.createClient({
      accessKey: "SCW2CHAG3KAMSATFRRJE",
      secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
    });
    console.log("Client created:", typeof client);
    console.log("Client keys:", Object.keys(client).slice(0, 15));
  }
}).catch(e => console.log("sdk-client error:", e.message));