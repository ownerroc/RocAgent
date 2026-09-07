import * as account from "@scaleway/sdk-account";
import * as rdb from "@scaleway/sdk-rdb";
import * as func from "@scaleway/sdk-function";
import * as billing from "@scaleway/sdk-billing";

console.log("Account exports:", Object.keys(account));
console.log("RDB exports:", Object.keys(rdb));
console.log("Function exports:", Object.keys(func));
console.log("Billing exports:", Object.keys(billing));