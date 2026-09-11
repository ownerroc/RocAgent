# codeAnalyze - Structure & Content Analysis Tool

This tool is used to deeply analyze directory structures, dependencies, and file content within the workspace.

## 📌 Main Features

| Action | Description | Parameters | Return Sample |
|--------|-----------|-----------|--------------|
| **structure** | Analyze directory and file structure | `maxDepth` (default: 5) | `{ status: "success", root: "/path", tree: [...], fileCount: N, directoryCount: M }` |
| **dependencies** | Detect all import/require dependencies in all files | - | `{ dependencies: { internal: [...], external: [...] } }` |
| **file** | Detailed analysis of a specific file (size, lines, binary, etc) | `filename` | `{ name: "file.ts", path: "/...", size: 1024, lines: 42, isBinary: false }` |
| **performance** | Check common workspace performance | - | `{ tool: "eslint", issues: 0, status: "success" }` |
| **full** | Combination of structure + dependencies + performance | - | `{ root: "/path", dependencies: {...}, tree: [...], fileCount: N }` |
| **security** | Analyze potential security vulnerabilities (TODO) | `filename` | `{ status: "success", risks: [], vulnerabilities: 0 }` |
| **dom** | Analyze HTML/DOM structure (devTool.analyze integration) | `filename` | `{ dom: {...}, status: "success" }` |

## 🔧 Usage Examples

### 1. Directory Structure Analysis
```ts
const result = await roc.codeAnalyze('structure', undefined, 5);
console.log(result.tree); // Recursive directory structure
```

### 2. Check Dependencies
```ts
const deps = await roc.codeAnalyze('dependencies');
console.log(deps.external); // ['lodash', 'axios']
```

### 3. Specific File Analysis
```ts
const fileResult = await roc.codeAnalyze('file', './server/tools.ts');
console.log(fileResult); // File details (size, lines, binary)
```

### 4. DOM Debugging
```ts
const domResult = await roc.codeAnalyze('dom', './assets/index.html');
console.log(domResult.dom); // DOM tree structure
```

## ⚙️ Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-----------|
| **action** | `'structure'|'dependencies'|'security'|'performance'|'full'|'file'|'dom'` | Required | Type of analysis to perform |
| **filename** | `string` | - | File path for specific analysis (used in `file`, `security`, `dom`) |
| **maxDepth** | `number` | `5` | Directory structure recursion depth (only for `structure` and `full`) |

## 🛡️ Integration

- **Support:**
  - Node.js (CommonJS & ESM)
  - Termux/Termux:env
  - Ubuntu/Debian (GLIBC ≥ 2.31 via Termux/OCI VM)

- **File System:**
  - Supports file analysis up to 2GB (with automatic chunking)
  - Recognizes `.gitignore` and ignores default directories/filters (`node_modules`, `.git`)

- **Error Handling:**
  - `Error("Filename required for 'file' action")` if `filename` not given in `file`/`dom`/`security` action
  - `Error("Unsupported action '...'")` if action is invalid
  - Stack trace hidden in production, shown in development (`NODE_ENV=development`)

## 📊 Return Value Structure

All responses have the format:
```json
{
  "status": "success|error",
  "action": "...",
  "timestamp": "ISO8601",
  "message": "...",
  ...specificData
}
```

## 🧪 Local Testing

```bash
npm run dev  # Run dev server
tsx scripts/test-codeAnalyze.ts # Test with tsx (must be installed globally)
```

## 🚀 Roadmap

- [x] Detect security vulnerabilities in `security` action (via semgrep CLI + local patterns) → **IMPLEMENTATION COMPLETE**
- [x] Integrate with `devTool.analyze` for `performance` action (using eslint-ts-standard-rules) → **IMPLEMENTATION COMPLETE**
- [x] Support arbitrary content analysis (yaml, xml, json) in `content` action → **IMPLEMENTATION COMPLETE**
- [x] Monthly workspace structure report automation → **IMPLEMENTATION COMPLETE** (via .github/workflows/cleanup.yml)

## 🔗 Other

- **Interface:** Defined in `RocSystemTools.ts`
- **Implementation:** `server/tools.ts` (function `codeAnalyze`)
- **Database:** Registered in `server/db.ts`
- **Code Examples:** `tests/structure.test.cjs`
- **Interface Documentation:** In `RocSystemTools.ts`

---

*Documentation last updated: v1.2.0*
*Contact: Team DevOps (ivansslo)*