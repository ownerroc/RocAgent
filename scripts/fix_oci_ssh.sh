#!/bin/bash
# Script untuk fix SSH key ke Oracle VM
# Jalankan: bash scripts/fix_oci_ssh.sh

set -e

echo "=== Fix SSH Key untuk Oracle VM ==="

# 1. Copy OCI private key
echo "[1/4] Copy OCI private key..."
cp /sdcard/vm/ivansuselo@gmail.com-2026-08-08T18_24_11.837Z.pem ~/rocsystem/data/data/com.termux/files/home/.oci/
chmod 600 ~/rocsystem/data/data/com.termux/files/home/.oci/ivansuselo@gmail.com-2026-08-08T18_24_11.837Z.pem

# 2. Update config dengan key_file yang benar
echo "[2/4] Update OCI config..."
cat > ~/rocsystem/data/data/com.termux/files/home/.oci/config << 'EOF'
[DEFAULT]
user=ocid1.user.oc1..aaaaaaaapqqiklbf4nzdig2igdlg4j32itqc742f3gpnnc3zkcnrra4hgrfa
fingerprint=a1:3a:75:e7:39:5a:b6:6c:b2:ad:f5:22:40:6e:77:a2
tenancy=ocid1.tenancy.oc1..aaaaaaaacjngdgzlotanmtvz6y3esckykgbsj2vdrmj53h4y367xg6n2cf4a
region=ap-singapore-1
key_file=/data/data/com.termux/files/home/rocsystem/data/data/com.termux/files/home/.oci/ivansuselo@gmail.com-2026-08-08T18_24_11.837Z.pem
EOF

# 3. Generate SSH key jika belum ada
echo "[3/4] Generate SSH key..."
if [ ! -f ~/.ssh/oci_vm_ed25519 ]; then
    ssh-keygen -t ed25519 -f ~/.ssh/oci_vm_ed25519 -N "" -C "rocsystem@oracle-vm"
fi

# 4. Show SSH key untuk upload manual
echo "[4/4] SSH Key siap..."
echo ""
echo "=== Selesai ==="
echo "SSH public key:"
cat ~/.ssh/oci_vm_ed25519.pub
echo ""
echo "Silakan upload manual key di atas ke Oracle Cloud Console:"
echo "Compute -> Instances -> Instance Details -> Edit -> SSH Keys"