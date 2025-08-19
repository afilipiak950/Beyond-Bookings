import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

export const sqlQuerySchema = z.object({
  name: z.literal('readonly'),
  sql: z.string().min(1, "SQL query cannot be empty"),
  params: z.array(z.any()).optional(),
});

export type SqlQueryParams = z.infer<typeof sqlQuerySchema>;

export interface SqlQueryResult {
  rows: any[];
  error?: string;
  executedQuery?: string;
}

// Security: Only allow SELECT statements
function validateReadOnlyQuery(query: string): boolean {
  const normalized = query.trim().toLowerCase();
  
  // Must start with SELECT
  if (!normalized.startsWith('select')) {
    return false;
  }
  
  // Block dangerous keywords
  const dangerousKeywords = [
    'insert', 'update', 'delete', 'drop', 'create', 'alter', 
    'truncate', 'exec', 'execute', 'grant', 'revoke', 'copy',
    'bulk', 'merge', 'call', 'xp_', 'sp_'
  ];
  
  for (const keyword of dangerousKeywords) {
    if (normalized.includes(keyword)) {
      return false;
    }
  }
  
  return true;
}

export async function sqlQuery(params: SqlQueryParams): Promise<SqlQueryResult> {
  try {
    const { sql: query, params: queryParams = [] } = params;
    
    // Validate query is read-only
    if (!validateReadOnlyQuery(query)) {
      return {
        rows: [],
        error: 'Only SELECT queries are allowed. DDL/DML operations are blocked for security.'
      };
    }
    
    // Execute the query with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout (10s)')), 10000);
    });
    
    const queryPromise = db.execute(sql.raw(query, queryParams));
    
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    return {
      rows: Array.isArray(result) ? result : [result],
      executedQuery: query
    };
    
  } catch (error) {
    console.error('SQL Query error:', error);
    return {
      rows: [],
      error: error.message || 'Unknown SQL error',
      executedQuery: params.sql
    };
  }
}

export const sqlQueryToolDefinition = {
  type: 'function',
  function: {
    name: 'sql_query',
    description: 'Execute read-only SQL queries against the database. Only SELECT statements are allowed.',
    parameters: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'SQL SELECT query to execute'
        },
        params: {
          type: 'array',
          description: 'Optional parameters for the SQL query',
          items: {
            oneOf: [
              { type: 'string' },
              { type: 'number' },
              { type: 'boolean' }
            ]
          }
        }
      },
      required: ['sql']
    }
  }
};