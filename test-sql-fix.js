// Test the SQL query system with the user's exact question
import { sql_query } from './server/ai/tools/sql_query.js';

console.log('🧪 Testing SQL Query System...\n');

// Test the exact query the AI is likely generating
const testInput = {
  query: "SELECT * FROM kalkulationen WHERE hotel_name = 'Dolder Grand' ORDER BY created_at DESC LIMIT 1",
  context: "gib mir infos zur kalkaulktion voin dolder grand",
  userId: 1
};

console.log('📝 Input:', testInput);
console.log('─'.repeat(50));

sql_query(testInput).then(result => {
  console.log('✅ Result:', {
    rowCount: result.rowCount,
    hasData: result.rows && result.rows.length > 0,
    sampleRow: result.rows?.[0] || null,
    executedQuery: result.executedQuery,
    error: result.error
  });
}).catch(error => {
  console.error('❌ Error:', error.message);
});