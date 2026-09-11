# RocAgent

**Type**: Internal Local Agent  
**Version**: 2.0.0  
**Port**: 3001  
**Workspace**: rocsystem (core)

---

## What is RocSystem?

RocSystem is an **autonomous AI agent** running in a Termux Android environment (localhost). This agent acts as a personal assistant that can execute shell commands, manage databases, cloud VMs, containers, and various automation tasks.

---

## System Requirements

| Component | Minimum |
|-----------|---------|
| Node.js | v20+ (recommended v26+) |
| npm | v10+ |
| OS | Termux (Android) / Linux |
| Access | SSH (optional) |

---

## Installation & Run

```bash
# Clone repository
git clone https://github.com/ownerroc/RocAgent.git
cd RocAgent

# Install dependencies
npm install

# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Agent** | Autonomous AI agent with LLM (Groq/CF Sherlock) |
| 💻 **Shell Execution** | Shell command execution with security |
| 🗄️ **Database** | Neon Postgres & Snowflake Cortex |
| ☁️ **Cloud VM** | Oracle Cloud Infrastructure (OCI) management |
| 📦 **Container** | rootd rootless container runtime |
| 🔐 **Encryption** | rocVault file encryption |
| 🔗 **Webhook** | roadfxHook integration |
| 🛠️ **Self-Develop** | Dynamic self-improvement capability |

---

## Configuration

Copy `.env.example` to `.env` and fill in the required variables:

```bash
cp .env.example .env
```

Important variables:
- `WEB_PASSWORD` — Password for web UI access
- `GROQ_KEY` — Groq API key (for LLM)
- `NEON_URI` — Neon database connection string

---

## Access

| Access | URL |
|--------|-----|
| Web UI | http://127.0.0.1:3001 |
| API | http://127.0.0.1:3001/api |

---

## Sponsorship & Support

RocAgent is an open-source project developed and maintained by **@ownerroc** and **@ivansslo**. Your support helps keep this project alive and continuously improved.

### 💖 Ways to Support

| Method | Description |
|--------|-------------|
| **GitHub Sponsors** | [Become a sponsor](https://github.com/sponsors/ownerroc) |
| **Donations** | Any amount helps cover hosting & development costs |
| **Contributions** | Submit PRs, report bugs, suggest features |

### 🙏 Thank You

Special thanks to all contributors and supporters who help make RocAgent better!

---

## Security

- Shell commands are protected with `SHELL_GUARD`
- Web UI requires password
- Credentials stored in `.env` (not committed)

---

## License

MIT License - see NOTICE.md for details.
