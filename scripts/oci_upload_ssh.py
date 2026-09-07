#!/usr/bin/env python3
"""Upload SSH key to Oracle Cloud VM using OCI SDK"""

import os
import oci
from oci import config

# Load OCI config from specific location
config_path = os.path.expanduser("~/rocsystem/data/data/com.termux/files/home/.oci/config")
try:
    cfg = config.from_file(file_location=config_path)
except Exception as e:
    print(f"Error loading config: {e}")
    exit(1)

# Read SSH public key
ssh_key_path = os.path.expanduser("~/.ssh/oci_vm_ed25519.pub")
if not os.path.exists(ssh_key_path):
    print(f"SSH key not found at {ssh_key_path}")
    exit(1)

with open(ssh_key_path, "r") as f:
    ssh_public_key = f.read().strip()

print(f"SSH Public Key:\n{ssh_public_key}\n")

# Get compute client
compute_client = oci.core.ComputeClient(cfg)

# Find the instance - using memory info
# Instance OCID from memory: ocid1.instance.oc1.ap-singapore-1.aaaaaa...
# Let's list instances in compartment

compartment_id = cfg.get("compartment_id")
if not compartment_id:
    # Try to get from tenancy
    compartment_id = cfg.get("tenancy")

print(f"Compartment ID: {compartment_id}")

try:
    instances = compute_client.list_instances(compartment_id).data
    for instance in instances:
        print(f"Instance: {instance.display_name} - {instance.id}")
        print(f"  State: {instance.lifecycle_state}")
        print(f"  IP: {instance.ipv4_address}")
except Exception as e:
    print(f"Error listing instances: {e}")