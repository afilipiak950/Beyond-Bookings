import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function testQuery() {
  console.log('🔥 Testing direct database query...');
  try {
    const result = await db.execute(sql`SELECT * FROM pricing_calculations ORDER BY created_at DESC LIMIT 1`);
    console.log('✅ Direct query result:', JSON.stringify(result, null, 2));
    console.log('✅ Result rows:', result.rows);
    console.log('✅ Result length:', result.rows?.length || result.length);
    
    // Also test with sql.raw
    console.log('\n🔥 Testing with sql.raw...');
    const rawResult = await db.execute(sql.raw('SELECT * FROM pricing_calculations ORDER BY created_at DESC LIMIT 1'));
    console.log('✅ Raw query result:', JSON.stringify(rawResult, null, 2));
  } catch (error) {
    console.log('❌ Direct query error:', error);
  }
}

testQuery().then(() => process.exit(0));