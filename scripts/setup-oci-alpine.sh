#!/bin/bash
# Setup OCI config for Alpine box
# Run this script to copy OCI config to Alpine box

# Copy config from host to Alpine box
rootd sh alpine -- cp /data/data/com.termux/files/home/.oci/config /root/.oci/config 2>/dev/null || {
    echo "Manual copy needed:"
    echo "1. On host: cat ~/.oci/config"
    echo "2. On Alpine: nano /root/.oci/config"
}

# Or use this alternative method - create config interactively
echo "To setup OCI manually in Alpine box:"
echo "rootd sh alpine -- oci setup config"