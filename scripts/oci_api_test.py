#!/usr/bin/env python3
"""Upload SSH key to Oracle Cloud VM using REST API"""

import os
import requests
import json
import base64

# Config
config_path = os.path.expanduser("~/rocsystem/data/data/com.termux/files/home/.oci/config")
key_path = os.path.expanduser("~/rocsystem/data/data/com.termux/files/home/.oci/ivansuselo@gmail.com-2026-08-08T18_24_11.837Z.pem")
ssh_key_path = os.path.expanduser("~/.ssh/oci_vm_ed25519.pub")

# Parse config manually
config = {}
with open(config_path, "r") as f:
    for line in f:
        if "=" in line:
            key, value = line.strip().split("=", 1)
            config[key] = value

user = config.get("user")
tenancy = config.get("tenancy")
region = config.get("region")
fingerprint = config.get("fingerprint")

print(f"User: {user}")
print(f"Tenancy: {tenancy}")
print(f"Region: {region}")

# Read SSH public key
with open(ssh_key_path, "r") as f:
    ssh_public_key = f.read().strip()

print(f"\nSSH Public Key:\n{ssh_public_key}\n")

# For now, just list the instance details
# The actual SSH key upload would require signing requests with the private key
print("To upload SSH key to OCI VM, we need to either:")
print("1. Use OCI CLI (needs Python 3.11/3.12)")
print("2. Use OCI SDK with proper Python environment")
print("3. Use Oracle Cloud Console manually")
print("\nLet's try to at least get instance info via API...")

# Try to get instance info using simple API call
# This won't work without proper auth, but let's see
endpoint = f"https://iaas.{region}.oraclecloud.com/20160918/instances"
print(f"\nAPI Endpoint: {endpoint}")