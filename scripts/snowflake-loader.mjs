#!/usr/bin/env node
/**
 * Snowflake Data Loader
 * Exports db.json logs to SQL statements for FACT_TOOL_EXECUTION
 * 
 * Usage: node scripts/snowflake-loader.mjs [--dry-run] [--limit N]
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;

// Load db.json
const dbPath = './db.json';
if (!fs.existsSync(dbPath)) {
  console.error('db.json not found');
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const logs = db.logs || [];

console.log(`Found ${logs.length} log entries`);

if (limit) {
  console.log(`Limiting to ${limit} entries`);
}

// Transform logs to FACT_TOOL_EXECUTION format
const transformLog = (log, idx) => {
  const timestamp = log.timestamp || new Date().toISOString();
  const toolName = log.toolName || 'unknown';
  const args = log.args || {};
  const result = log.result || {};
  
  // Extract duration_ms from result if available
  let durationMs = 0;
  if (result.durationMs) {
    durationMs = result.durationMs;
  } else if (result.duration_ms) {
    durationMs = result.duration_ms;
  }
  
  // Determine status
  let status = 'SUCCESS';
  let errorMessage = null;
  
  if (result.status === 'error' || result.status === 'failure') {
    status = 'FAILURE';
    errorMessage = result.message || JSON.stringify(result.error || {});
  } else if (result.status === 'timeout') {
    status = 'TIMEOUT';
    errorMessage = result.message || 'Operation timed out';
  } else if (result.error) {
    status = 'FAILURE';
    errorMessage = result.error.message || JSON.stringify(result.error);
  }
  
  // Extract session_id and user_id if available
  const sessionId = log.sessionId || args.sessionId || `session_${Math.floor(idx / 100)}`;
  const userId = log.userId || args.userId || 'rocagent';
  
  return {
    execution_id: `exec_${Date.now()}_${idx}`,
    session_id: sessionId,
    tool_name: toolName,
    timestamp: timestamp,
    duration_ms: durationMs,
    status: status,
    error_message: errorMessage,
    user_id: userId,
  };
};

// Generate SQL INSERT statements
const generateInserts = (records) => {
  const tableName = 'ROCAGENTINSIGHT_DB.RAW.EXECUTION_LOG_RAW';
  
  const sql = records.map(r => {
    const values = [
      r.execution_id,
      r.session_id,
      r.tool_name,
      r.timestamp,
      r.duration_ms,
      r.status,
      r.error_message ? `'${r.error_message.replace(/'/g, "''")}'` : 'NULL',
      r.user_id,
    ].join(', ');
    
    return `INSERT INTO ${tableName} (EXECUTION_ID, SESSION_ID, TOOL_NAME, TIMESTAMP, DURATION_MS, STATUS, ERROR_MESSAGE, USER_ID) VALUES (${values});`;
  });
  
  return sql.join('\n');
};

// Generate MERGE statements for analytics table
const generateAnalyticsMerge = (records) => {
  const tableName = 'ROCAGENTINSIGHT_DB.ANALYTICS.FACT_TOOL_EXECUTION';
  
  const sql = records.map(r => {
    return `MERGE INTO ${tableName} tgt
USING (SELECT 
  '${r.execution_id}' AS EXECUTION_ID,
  '${r.session_id}' AS SESSION_ID,
  '${r.tool_name}' AS TOOL_NAME,
  '${r.timestamp}'::TIMESTAMP AS TIMESTAMP,
  ${r.duration_ms} AS DURATION_MS,
  '${r.status}' AS STATUS,
  ${r.error_message ? `'${r.error_message.replace(/'/g, "''")}'` : 'NULL'} AS ERROR_MESSAGE,
  '${r.user_id}' AS USER_ID
) src
ON tgt.EXECUTION_ID = src.EXECUTION_ID
WHEN NOT MATCHED THEN INSERT (EXECUTION_ID, SESSION_ID, TOOL_NAME, TIMESTAMP, DURATION_MS, STATUS, ERROR_MESSAGE, USER_ID)
VALUES (src.EXECUTION_ID, src.SESSION_ID, src.TOOL_NAME, src.TIMESTAMP, src.DURATION_MS, src.STATUS, src.ERROR_MESSAGE, src.USER_ID);`;
  });
  
  return sql.join('\n\n');
};

// Process logs
const processedLogs = (limit ? logs.slice(0, limit) : logs).map((log, idx) => transformLog(log, idx));

console.log(`\nProcessed ${processedLogs.length} records`);
console.log(`Status breakdown:`);
const statusCounts = {};
processedLogs.forEach(log => {
  statusCounts[log.status] = (statusCounts[log.status] || 0) + 1;
});
Object.entries(statusCounts).forEach(([status, count]) => {
  console.log(`  ${status}: ${count}`);
});

// Generate SQL
const rawSql = generateInserts(processedLogs);
const analyticsSql = generateAnalyticsMerge(processedLogs);

// Output
const outputDir = './snowflake/output';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const rawFile = `${outputDir}/insert_raw_logs.sql`;
const analyticsFile = `${outputDir}/merge_analytics.sql`;
const jsonFile = `${outputDir}/execution_logs.json`;

if (dryRun) {
  console.log('\n=== DRY RUN - SQL would be generated ===');
  console.log(`\nRaw SQL (first 5 statements):`);
  console.log(rawSql.split('\n').slice(0, 5).join('\n'));
  console.log(`\n... (${processedLogs.length} total statements)`);
} else {
  fs.writeFileSync(rawFile, rawSql);
  fs.writeFileSync(analyticsFile, analyticsSql);
  fs.writeFileSync(jsonFile, JSON.stringify(processedLogs, null, 2));
  
  console.log(`\nGenerated files:`);
  console.log(`  - ${rawFile} (${fs.statSync(rawFile).size} bytes)`);
  console.log(`  - ${analyticsFile} (${fs.statSync(analyticsFile).size} bytes)`);
  console.log(`  - ${jsonFile} (${fs.statSync(jsonFile).size} bytes)`);
}

console.log('\n=== Loader Complete ===');
console.log('Next steps:');
console.log('1. Review the generated SQL files');
console.log('2. Run them in Snowflake using SnowSQL or the UI');
console.log('3. Or use the REST API to execute the statements');