// Debug - Check interceptor to find where auth is stored
import { createClient } from "@scaleway/sdk-client";

const client = createClient({
  accessKey: "SCW2CHAG3KAMSATFRRJE",
  secretKey: "034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720",
  defaultProjectId: "86ec872f-6bce-4db5-a191-95b64e1c4ef6",
});

console.log("=== INTERCEPTOR DEBUG ===");
const interceptor = client.settings.interceptors[0];
console.log("Interceptor:", interceptor);

// Call the request interceptor to see what it does
const mockRequest = { url: "https://api.scaleway.com/test", options: {} };
interceptor.request({} as any, mockRequest as any).then(console.log).catch(console.error);