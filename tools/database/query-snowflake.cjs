/**
 * Query Snowflake - Natural Language to SQL
 * Uses Snowflake Cortex Agent for natural language queries
 */

const { getSnowflakeConnection } = require('./db-connector');

async function querySnowflake(naturalQuestion) {
  if (!naturalQuestion) {
    throw new Error('Question required. Usage: node query-snowflake.js "Your question"');
  }

  const connection = await getSnowflakeConnection();

  // Use Snowflake Cortex for natural language
  const sql = `
    SELECT CORTEX.ANALYZE_TEXT(
      '${naturalQuestion.replace(/'/g, "''")}',
      'translate to SQL for table ROCAGENTINSIGHT_DB.GOVERNANCE.TOOL_EXECUTIONS'
    ) as sql_query
  `;

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      complete: (err, stmt, rows) => {
        connection.destroy();
        if (err) reject(err);
        else resolve({ question: naturalQuestion, sql: rows[0]?.SQL_QUERY || 'N/A', raw: rows });
      }
    });
  });
}

// CLI
if (require.main === module) {
  const question = process.argv.slice(2).join(' ');
  if (!question) {
    console.log('Usage: node query-snowflake.js "How many tools executed today?"');
    process.exit(1);
  }
  
  querySnowflake(question)
    .then(r => console.log(JSON.stringify(r, null, 2)))
    .catch(e => { console.error(e.message); process.exit(1); });
}

module.exports = { querySnowflake };