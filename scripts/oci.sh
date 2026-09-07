#!/data/data/com.termux/files/usr/bin/bash
# OCI CLI wrapper - menggunakan config dari ~/.oci/config atau /data/data/com.termux/files/home/.oci/config

CONFIG_PATH="/data/data/com.termux/files/home/.oci/config"
if [ -f "$CONFIG_PATH" ]; then
    export OCI_CONFIG_FILE="$CONFIG_PATH"
fi

/data/data/com.termux/files/usr/bin/rootd sh alpine -- oci "$@"
