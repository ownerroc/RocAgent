# 🔐 RocAgent & Workspace rocsystem Security Guidelines

> This guide must be read before doing any development/modification.

---

## 📌 Main Rules

1. **Store secrets in vault**
   - Do not store credentials/API keys/HARDCODED keys in any workspace.
   - Use `storeSecret` tool to store credentials securely.
   - Vault location: **always outside workspace**: `$HOME/.vaults/rocsystem-*.vault`

2. **Don't commit sensitive files**
   - Ensure `.gitignore` covers all temp/sensitive file patterns.
   - Use `git check-ignore -v <file>` to verify.
3. **Delete temporary data regularly**
   - Folder `.decrypt_file_test_tmp/` should only contain files being decrypted (deleted after finished).
4. **Set file permissions**
   - Credential files -> `chmod 600`
   - Vault folders -> `chmod 700`

---

## 🔧 Conventions & Guidelines

### 1. Vault Name & Location

| Data Type | Vault File Name | Location | Example Content |
|-----------|---------------|--------|--------------|
| OCI Credential | `oci.vault` | `$HOME/.vaults/rocsystem-oci.vault` | `OCI_API_KEY=xxxxx` |
| DB Credential | `db.vault` | `$HOME/.vaults/rocsystem-db.vault` | `DB_PASSWORD=xxxxx` |
| SSH Private Key | `ssh.vault` | `$HOME/.vaults/rocsystem-ssh.vault` | `SSH_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----` |

> **⚠️ WRONG:** Store vault in workspace (example: `./github.vault`)
> **✅ CORRECT:** Store vault outside workspace `$HOME/.vaults/`

### 2. File Patterns That Should NOT Exist in Workspace

| Pattern | Common Location | Action |
|------|--------------|----------|
| `.env` / `.env*` | Root workspace | Only include `.env.example` template |
| `*vault`, `*.key`, `*.pem` | Anywhere in workspace | Move to `$HOME/.vaults/` |
| `cookies.txt`, `manifest.json`, `*.bak` | Root workspace | Add to `.gitignore` |
| `alpine-*.rootfs` | `./rocxmo-push/` | Store in remote assets only |
| `test_scaleway.*`, `scaleway-*` | Every folder | Better backup+delete |

### 3. Tools & Scripts for Security

| Tool | Function | Required? |
|------|---------|-----------|
| `storeSecret` | Store credentials in vault | **MANDATORY** |
| `decryptFile` | Decrypt vault file | **MANDATORY** if processing vault |
| `terminal -e 'find . -name "*vault" -o -name "*key" -o -name "*.pem"'` | Find sensitive files | **EVERY NIGHT** |
| `scripts/clean.sh` | Delete temp & log | **RUN EVERY FRIDAY** |

### 4. Git Policy / Prevent Re-commit of Sensitive Data

```bash
# Before commit (use this Git hook):
#!/bin/bash
set -e
if git diff --name-only --cached | grep -E '\(vault\|key\|pem|cookies|env\)$'; then
  echo "❌ Error: Detected sensitive file in staging. Remove or vault it."
  exit 1
fi
git commit -m "..."
```

> Place this hook in `.git/hooks/pre-commit`

---

## 📜 Guide Application Examples

### Example 1: Processing Vault with CodeAnalyze Integration
```ts
import { execSync } from 'child_process';

const decryptDbPass = () => {
  try {
    // Decrypt vault outside workspace
    const decrypted = execSync(
      'npx -y rocagent decryptFile --filename $HOME/.vaults/rocsystem-db.vault --passphrase "MY_PASSPHRASE"',
      { encoding: 'utf8' }
    ).trim();
    return decrypted.split('DB_PASSWORD=')[1];
  } catch (e) {
    console.error('❌ Failed to decrypt DB vault');
    process.exit(1);
  }
};
```

### Example 2: Replace Keystore in Android Project
```bash
# Must not commit:
./rocxmo-push/app/testkey.keystore

# Action:
# 1. Delete from workspace
# 2. Store in vault: `keystore.vault` in $HOME/.vaults/
# 3. Store printout in safe physical device
```

### Example 3: Save SSH Key with Tool
```bash
# Use storeSecret tool:

roc.storeSecret \
  --vaultFile $HOME/.vaults/rocsystem-ssh.vault \
  --key "SSH_PRIVATE_KEY" \
  --value "-----BEGIN PRIVATE KEY-----" \
  --passphrase "vault-passphrase"
```

---

## 🔍 Automation Check Tools

| File | Function | Command |
|------|---------|----------|
| `.github/workflows/security-scan.yml` | Security GitHub Actions scan | `grep -E 'secrets|vault' .github/workflows/*.yml` |
| `tools/security/find-sensitive.sh` | Find all vault/key/pem | `./tools/security/find-sensitive.sh` |
| `check_all_tools.cjs` | Validate all tools | `node check_all_tools.cjs` |

> **✅ Make sure these tools are run regularly**

---

## 📋 Daily Security Maintenance Checklist

| Time | Action | Status |
|-------|--------|-------|
| Every morning | `./tools/security/find-sensitive.sh > report.txt` | ⏳ |
| Every week | Run `node .github/scripts/purge-temp.mjs` | ⏳ |
| Before commit | Git pre-commit hook (grep .vault/.key/.pem) | ⏳ |
| Monthly | Rotate all vaults + update checksum | ⏳ |

---

## 🚨 Emergency Steps

### If Vercel/Neon/Snowflake credential leaks:

1. **Immediately**:
   ```bash
   roc.storeSecret --vaultFile $HOME/.vaults/emergency.vault --key "LEAKED_CREDENTIAL" --value "xxxxx" --passphrase "emergency-pass" --force
   ```
2. **Report** to security team + review all GitHub Actions workflows.
3. **Rotate credentials** suspected across the entire system.

### If you find a leaked encrypted vault:
1. **Don't decrypt!**
2. **Move vault** to `.vaults/blacklist/`
3. **Report** + update `SECURITY_GUIDELINES.md` with the bug.

---

## 📚 Sources & References

- [Google Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Cloudflare Zero-Trust](https://developers.cloudflare.com/cloudflare-one/)
- [RocAgent CHANGES.md](CHANGES.md) (security-related change notes)

---

*🔒 This guide applies to all developers contributing to RocAgent/rocsystem*
*Last updated: v1.2.0*