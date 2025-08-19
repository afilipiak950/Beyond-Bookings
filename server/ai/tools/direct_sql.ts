import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

// Direct SQL execution bypassing Drizzle ORM issues
export async function executeDirectSQL(query: string): Promise<any> {
  console.log('🔥 DIRECT SQL - DATABASE_URL exists?', !!process.env.DATABASE_URL);
  console.log('🔥 DIRECT SQL - Query:', query);
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not found in environment');
  }
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  console.log('🔥 DIRECT SQL - Pool created');
  
  try {
    console.log('🔥 DIRECT SQL - Connecting to pool...');
    const client = await pool.connect();
    console.log('🔥 DIRECT SQL - Connected! Executing query...');
    
    const result = await client.query(query);
    console.log('🔥 DIRECT SQL - Query executed!');
    
    client.release();
    console.log('🔥 DIRECT SQL - Client released');
    
    console.log('🔥 DIRECT SQL RESULT:', {
      rowCount: result.rowCount,
      rowsLength: result.rows?.length,
      command: result.command,
      firstRow: result.rows?.[0]
    });
    
    return {
      rows: result.rows || [],
      rowCount: result.rowCount || result.rows?.length || 0,
      command: result.command
    };
  } catch (error: any) {
    console.error('🔥 DIRECT SQL ERROR:', error?.message || error);
    console.error('🔥 DIRECT SQL ERROR DETAILS:', {
      code: error?.code,
      detail: error?.detail,
      hint: error?.hint,
      position: error?.position
    });
    throw error;
  } finally {
    await pool.end();
    console.log('🔥 DIRECT SQL - Pool ended');
  }
}