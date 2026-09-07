/**
 * RocAgent Owner Lockdown Security Module
 * Implements unsensored boundaries between Owner and Agent
 * Location: /storage/emulated/0/.agent/owner-lock/ (outside agent's workspace)
 */
const fs = require("fs");
const path = require("path");

const OWNER_LOCK_PATH = "/storage/emulated/0/.agent/owner-lock/owner-lock.json";
const AUDIT_LOG_PATH = "/storage/emulated/0/.agent/owner-lock/audit.log";
const KILL_SWITCH_PATH = "/storage/emulated/0/.agent/owner-lock/kill.switch";

let cachedConfig = null;

function loadOwnerLock() {
  try {
    if (fs.existsSync(OWNER_LOCK_PATH)) {
      const content = fs.readFileSync(OWNER_LOCK_PATH, "utf-8");
      cachedConfig = JSON.parse(content);
      return cachedConfig;
    }
  } catch (e) {
    console.error("[OwnerLock] Failed to load config:", e);
  }
  return null;
}

function getConfig() {
  if (!cachedConfig) {
    const loaded = loadOwnerLock();
    if (loaded) return loaded;
  }
  // Return default permissive config if no lock file exists
  return {
    version: "1.0.0",
    created: new Date().toISOString(),
    owner: { github: "unknown", name: "Unknown", trusted: false },
    security: {
      whitelistCommands: [],
      blacklistCommands: [],
      sensitiveActionsRequireConfirmation: [],
      maxExecTime: 300000,
      maxFileSize: 10485760,
      allowNetworkAccess: true,
      allowExternalApi: true,
    },
    auditLog: { enabled: true, path: AUDIT_LOG_PATH, retentionDays: 90 },
    killSwitch: { enabled: true, triggerFile: KILL_SWITCH_PATH, action: "stop" },
    immutable: false,
  };
}

function writeAuditLog(action, toolName, args, result, status) {
  const config = getConfig();
  if (!config.auditLog.enabled) return;

  const entry = {
    timestamp: new Date().toISOString(),
    action,
    tool: toolName,
    args: args ? JSON.stringify(args).slice(0, 500) : "",
    result: result ? JSON.stringify(result).slice(0, 500) : "",
    status,
  };

  try {
    const logLine = JSON.stringify(entry) + "\n";
    fs.appendFileSync(config.auditLog.path, logLine);
  } catch (e) {
    // Agent cannot write to audit log - this is intentional
  }
}

function checkKillSwitch() {
  const config = getConfig();
  if (!config.killSwitch.enabled) return false;

  try {
    if (fs.existsSync(config.killSwitch.triggerFile)) {
      const content = fs.readFileSync(config.killSwitch.triggerFile, "utf-8").trim();
      return content.toLowerCase() === "on" || content === "1" || content === "true";
    }
  } catch (e) {
    // Cannot read kill switch - agent has no access
  }
  return false;
}

function isKillSwitchActive() {
  return checkKillSwitch();
}

function getOwnerInfo() {
  const config = getConfig();
  return config.owner;
}

/**
 * Check if a tool call is allowed based on owner-lock rules
 */
function checkToolSecurity(toolName, args) {
  const config = getConfig();

  // Kill switch takes precedence
  if (checkKillSwitch()) {
    return { allowed: false, reason: "Kill switch is ACTIVE - agent disabled", requiresConfirmation: false };
  }

  // Check blacklist first (explicit denials)
  const blacklist = config.security.blacklistCommands;
  for (const blocked of blacklist) {
    if (toolName === blocked) {
      writeAuditLog("BLACKLIST", toolName, args, null, "DENY");
      return { allowed: false, reason: `Tool '${toolName}' is blacklisted by owner`, requiresConfirmation: false };
    }

    // Check pattern-based blocking (e.g., "exec:rm -rf")
    if (toolName === blocked.split(":")[0]) {
      const pattern = blocked.split(":")[1];
      if (pattern && args?.command && args.command.includes(pattern)) {
        writeAuditLog("BLACKLIST_PATTERN", toolName, args, null, "DENY");
        return { allowed: false, reason: `Command pattern '${pattern}' is blacklisted`, requiresConfirmation: false };
      }
    }
  }

  // Check whitelist (if defined, only allow listed tools)
  const whitelist = config.security.whitelistCommands;
  if (whitelist.length > 0 && !whitelist.includes(toolName)) {
    writeAuditLog("WHITELIST", toolName, args, null, "DENY");
    return { allowed: false, reason: `Tool '${toolName}' is not in owner's whitelist`, requiresConfirmation: false };
  }

  // Check sensitive actions requiring confirmation
  const sensitiveActions = config.security.sensitiveActionsRequireConfirmation;
  for (const sensitive of sensitiveActions) {
    const [actionTool, pattern] = sensitive.split(":");
    if (toolName === actionTool) {
      if (!pattern) {
        // Any use of this tool requires confirmation
        writeAuditLog("SENSITIVE", toolName, args, null, "CONFIRM");
        return { allowed: false, reason: `Tool '${toolName}' requires owner confirmation`, requiresConfirmation: true };
      }
      // Check pattern match
      const argsStr = JSON.stringify(args);
      if (argsStr.includes(pattern)) {
        writeAuditLog("SENSITIVE_PATTERN", toolName, args, null, "CONFIRM");
        return { allowed: false, reason: `Sensitive action detected: ${pattern}`, requiresConfirmation: true };
      }
    }
  }

  // All checks passed
  writeAuditLog("ALLOW", toolName, args, null, "ALLOW");
  return { allowed: true };
}

/**
 * Wrapper to execute a tool with security checks
 */
async function executeWithSecurityCheck(toolName, args, executeToolFn) {
  const check = checkToolSecurity(toolName, args);

  if (!check.allowed) {
    if (check.requiresConfirmation) {
      return {
        error: "CONFIRMATION_REQUIRED",
        message: check.reason,
        toolName,
        args,
      };
    }
    return { error: "DENIED", message: check.reason };
  }

  // Execute the tool
  const result = await executeToolFn();
  writeAuditLog("EXECUTE", toolName, args, result, "ALLOW");
  return result;
}

/**
 * Get audit log entries (agent can only read, not modify)
 */
function getAuditLog(lines = 100) {
  const config = getConfig();
  try {
    if (fs.existsSync(config.auditLog.path)) {
      const content = fs.readFileSync(config.auditLog.path, "utf-8");
      const allLines = content.split("\n").filter(Boolean);
      return allLines.slice(-lines);
    }
  } catch (e) {
    // Cannot read - agent has no access
  }
  return [];
}

/**
 * Reload owner-lock config (for admin updates)
 */
function reloadConfig() {
  cachedConfig = null;
  loadOwnerLock();
}

module.exports = {
  isKillSwitchActive,
  getOwnerInfo,
  checkToolSecurity,
  executeWithSecurityCheck,
  getAuditLog,
  reloadConfig,
};