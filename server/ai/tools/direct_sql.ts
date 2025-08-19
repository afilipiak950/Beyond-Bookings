import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

// Direct SQL execution bypassing Drizzle ORM issues
export async function executeDirectSQL(query: string): Promise<any> {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  console.log('🔥 DIRECT SQL EXECUTION:', query);
  
  try {
    const client = await pool.connect();
    const result = await client.query(query);
    client.release();
    
    console.log('🔥 DIRECT SQL RESULT:', {
      rowCount: result.rowCount,
      rows: result.rows,
      command: result.command
    });
    
    return {
      rows: result.rows || [],
      rowCount: result.rowCount || result.rows?.length || 0,
      command: result.command
    };
  } catch (error) {
    console.error('🔥 DIRECT SQL ERROR:', error);
    throw error;
  } finally {
    await pool.end();
  }
}