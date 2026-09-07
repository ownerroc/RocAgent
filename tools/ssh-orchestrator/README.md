# SSH Orchestrator

Multi-device SSH command execution tool for RocSystem.

## Features

- **Multi-device management** - Add, remove, list devices
- **Group support** - Organize devices into groups
- **Connection testing** - Ping/check connectivity
- **Configurable timeouts** - Set per-device timeouts

## Usage

### Add a Device
```bash
node ssh-orchestrator.cjs add web1 192.168.1.10 22 root
node ssh-orchestrator.cjs add web2 192.168.1.11 22 root ~/.ssh/id_rsa
```

### Execute Commands
```bash
# On specific devices
node ssh-orchestrator.cjs exec web1,web2 "df -h"

# On all devices
node ssh-orchestrator.cjs all "uptime"
```

### Device Groups
```bash
# Create a group
node ssh-orchestrator.cjs group prod web1,web2,web3

# Run on group
node ssh-orchestrator.cjs run-group prod "systemctl restart nginx"
```

### Check Connectivity
```bash
node ssh-orchestrator.cjs ping
node ssh-orchestrator.cjs ping web1,web2
```

## Command Reference

| Command | Description |
|---------|-------------|
| `add <alias> <host> <port> <user> [key]` | Add device |
| `remove <alias>` | Remove device |
| `list` | List all devices |
| `exec <aliases> <command>` | Execute on devices |
| `all <command>` | Execute on all devices |
| `ping [aliases]` | Check connectivity |
| `group <name> <aliases>` | Create group |
| `groups` | List groups |
| `run-group <name> <command>` | Execute on group |

## Examples

```bash
node ssh-orchestrator.cjs add web1 192.168.1.10 22 root ~/.ssh/id_rsa
node ssh-orchestrator.cjs exec web1,web2 "df -h"
node ssh-orchestrator.cjs all "uptime"
node ssh-orchestrator.cjs group prod web1,web2,web3
node ssh-orchestrator.cjs run-group prod "systemctl restart nginx"
```