import { db } from '../../db.js';
import { sql } from 'drizzle-orm';

export interface SqlQueryInput {
  query?: string;
  sql?: string;
  params?: string[];
  context?: string;
  userId?: number;
}

export interface SqlQueryResult {
  rows: any[];
  rowCount: number;
  executedQuery: string;
  took_ms: number;
  error?: string;
  errorCode?: string;
}

export async function sql_query(input: SqlQueryInput): Promise<SqlQueryResult> {
  const startTime = Date.now();
  
  console.log('🚀 SQL_QUERY FUNCTION CALLED WITH:', JSON.stringify(input));
  
  try {
    // Get query from either field for backward compatibility
    let query = input.query || input.sql;
    
    if (!query || typeof query !== 'string') {
      return {
        rows: [],
        rowCount: 0,
        executedQuery: '',
        took_ms: Date.now() - startTime,
        error: 'Query is required and must be a string',
        errorCode: 'INVALID_INPUT'
      };
    }

    // Trim query
    query = query.trim();
    
    // Security: Only allow read-only operations
    const upperQuery = query.toUpperCase();
    if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('WITH') && !upperQuery.startsWith('EXPLAIN')) {
      return {
        rows: [],
        rowCount: 0,
        executedQuery: query,
        took_ms: Date.now() - startTime,
        error: 'Only SELECT, WITH, and EXPLAIN queries are allowed',
        errorCode: 'FORBIDDEN_OPERATION'
      };
    }

    // Check for forbidden keywords
    const forbiddenKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE'];
    for (const keyword of forbiddenKeywords) {
      if (upperQuery.includes(keyword)) {
        return {
          rows: [],
          rowCount: 0,
          executedQuery: query,
          took_ms: Date.now() - startTime,
          error: `Forbidden operation: ${keyword} is not allowed`,
          errorCode: 'FORBIDDEN_KEYWORD'
        };
      }
    }

    // Fix common table/column name mistakes for German hotels
    query = query.replace(/\bkalkulationen\b/gi, 'pricing_calculations');
    query = query.replace(/\bcalculations\b/gi, 'pricing_calculations');
    query = query.replace(/\bhotel_calculations\b/gi, 'pricing_calculations');
    query = query.replace(/\bberechnungen\b/gi, 'pricing_calculations');
    
    // Detect hotel name from context if provided
    const contextLower = input.context?.toLowerCase() || '';
    let hotelFilter = '';
    
    if (contextLower.includes('drei kronen')) {
      hotelFilter = "drei kronen";
    } else if (contextLower.includes('vier jahreszeiten')) {
      hotelFilter = "vier jahreszeiten";
    } else if (contextLower.includes('dolder')) {
      hotelFilter = "dolder";
    } else if (contextLower.includes('marriott')) {
      hotelFilter = "marriott";
    }
    
    // If hotel filter is detected and query is about pricing_calculations, ensure it's filtered
    if (hotelFilter && query.toLowerCase().includes('pricing_calculations')) {
      if (!query.toLowerCase().includes('where')) {
        // Add WHERE clause
        query = query.replace(/FROM\s+pricing_calculations/gi, 
          `FROM pricing_calculations WHERE hotel_name ILIKE '%${hotelFilter}%'`);
      } else if (!query.toLowerCase().includes('hotel_name')) {
        // Add to existing WHERE clause
        query = query.replace(/WHERE/gi, `WHERE hotel_name ILIKE '%${hotelFilter}%' AND`);
      }
    }
    
    console.log('🔍 EXECUTING QUERY:', query);
    
    // Execute query with timeout
    const queryPromise = db.execute(sql.raw(query));
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout (30s)')), 30000)
    );
    
    const result = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    // Extract rows from result
    let rows: any[] = [];
    if (Array.isArray(result)) {
      rows = result;
    } else if (result?.rows && Array.isArray(result.rows)) {
      rows = result.rows;
    } else if (result && typeof result === 'object') {
      rows = [result];
    }
    
    const rowCount = rows.length;
    const took_ms = Date.now() - startTime;
    
    console.log('✅ QUERY RESULT:', { rowCount, sampleRow: rows[0] });
    
    // If no results found, try a fallback query to get some data
    if (rowCount === 0 && contextLower.includes('calculation')) {
      console.log('🔄 No results found, trying fallback query...');
      
      let fallbackQuery = 'SELECT * FROM pricing_calculations ORDER BY created_at DESC LIMIT 5';
      
      if (hotelFilter) {
        fallbackQuery = `SELECT * FROM pricing_calculations WHERE hotel_name ILIKE '%${hotelFilter}%' ORDER BY created_at DESC LIMIT 5`;
      }
      
      try {
        const fallbackResult = await db.execute(sql.raw(fallbackQuery));
        let fallbackRows: any[] = [];
        
        if (Array.isArray(fallbackResult)) {
          fallbackRows = fallbackResult;
        } else if (fallbackResult?.rows) {
          fallbackRows = fallbackResult.rows;
        }
        
        if (fallbackRows.length > 0) {
          console.log('✅ FALLBACK SUCCESS:', fallbackRows.length, 'rows found');
          return {
            rows: fallbackRows,
            rowCount: fallbackRows.length,
            executedQuery: `${query} -- FALLBACK: ${fallbackQuery}`,
            took_ms: Date.now() - startTime
          };
        }
      } catch (fallbackError) {
        console.error('❌ Fallback query failed:', fallbackError);
      }
    }
    
    return {
      rows,
      rowCount,
      executedQuery: query,
      took_ms
    };
    
  } catch (error: any) {
    const took_ms = Date.now() - startTime;
    
    console.error('❌ SQL Query error:', error);
    
    return {
      rows: [],
      rowCount: 0,
      executedQuery: input.query || input.sql || '',
      took_ms,
      error: error?.message || 'Query execution failed',
      errorCode: error?.code || 'UNKNOWN_ERROR'
    };
  }
}