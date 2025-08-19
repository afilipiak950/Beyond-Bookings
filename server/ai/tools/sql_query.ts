import { db } from '../../db';
import { sql } from 'drizzle-orm';

export interface SqlQueryInput {
  query: string;
  params?: any[];
}

export interface SqlQueryResult {
  rows: any[];
  error?: string;
}

export async function sql_query(input: SqlQueryInput): Promise<SqlQueryResult> {
  try {
    const { query, params = [] } = input;
    
    // Security: Only allow SELECT statements
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select')) {
      return {
        rows: [],
        error: 'Only SELECT queries are allowed for security reasons'
      };
    }
    
    // Execute the query
    const result = await db.execute(sql.raw(query));
    
    return {
      rows: Array.isArray(result) ? result : [result]
    };
    
  } catch (error: any) {
    return {
      rows: [],
      error: error.message || 'Query execution failed'
    };
  }
}