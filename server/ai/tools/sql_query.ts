import { db } from '../../db';
import { sql } from 'drizzle-orm';

export interface SqlQueryInput {
  query?: string;
  sql?: string;  // Backward compatibility
  params?: string[];
}

export interface SqlQueryResult {
  rows: any[];
  rowCount: number;
  executedQuery: string;
  took_ms: number;
  error?: string;
  errorCode?: string;
  triage?: {
    schema: string;
    tables: string[];
    columns: { table: string; column: string; type: string }[];
  };
}

interface TriageData {
  schema: string;
  tables: string[];
  columns: { table: string; column: string; type: string }[];
}

export async function sql_query(input: SqlQueryInput | any): Promise<SqlQueryResult> {
  const startTime = Date.now();
  let executedQuery = '';
  
  try {
    // Handle both new format (query) and old format (sql) for backward compatibility
    let query = input.query || input.sql;
    let params = input.params || [];
    
    // CRITICAL FIX: Auto-correct wrong table names and column names
    if (query && typeof query === 'string') {
      // Fix common table name mistakes
      query = query.replace(/\bcalculations\b/g, 'pricing_calculations');
      query = query.replace(/\bhotel_calculations\b/g, 'pricing_calculations');
      query = query.replace(/\bcustomers\b/g, 'users');
      query = query.replace(/\bapprovals\b/g, 'approval_requests');
      
      // Fix column name mistakes - hotels table
      query = query.replace(/\brating\b/g, 'stars');
      query = query.replace(/\bprice\b/g, 'average_price');
      query = query.replace(/\bh\.hotel_name\b/g, 'h.name');
      query = query.replace(/\bhotels\.hotel_name\b/g, 'hotels.name');
      
      // Fix column name mistakes - pricing_calculations table  
      query = query.replace(/\bpc\.price\b/g, 'pc.voucher_price');
      query = query.replace(/\bpc\.cost\b/g, 'pc.operational_costs');
      
      // Fix generic column assumptions
      query = query.replace(/\bdetails\b/g, 'name, stars, city, location, amenities');
      query = query.replace(/\bdescription\b/g, 'review_summary');
      
      // Fix common function mistakes
      query = query.replace(/\btotal_calculations\b/g, 'COUNT(*)');
    }
    
    // Debug logging
    console.log('🔍 SQL Tool Debug:', {
      input,
      originalQuery: input.query || input.sql,
      correctedQuery: query,
      queryType: typeof query,
      params,
      replacementApplied: (input.query || input.sql) !== query
    });

    // Validate and sanitize input
    if (!query || typeof query !== 'string') {
      console.log('❌ SQL validation failed:', { query, type: typeof query });
      return {
        rows: [],
        rowCount: 0,
        executedQuery: '',
        took_ms: Date.now() - startTime,
        error: `Query is required and must be a string. Received: ${typeof query} = ${query}`,
        errorCode: 'INVALID_INPUT'
      };
    }

    // Trim and normalize query
    query = query.trim();
    executedQuery = query;
    
    // Security: Only allow read-only operations (SELECT, WITH, EXPLAIN)
    const upperQuery = query.toUpperCase();
    const allowedStarts = ['SELECT', 'WITH', 'EXPLAIN'];
    const isAllowed = allowedStarts.some(start => upperQuery.startsWith(start));
    
    if (!isAllowed) {
      return {
        rows: [],
        rowCount: 0,
        executedQuery,
        took_ms: Date.now() - startTime,
        error: 'Only SELECT, WITH, and EXPLAIN queries are allowed for security',
        errorCode: 'FORBIDDEN_OPERATION'
      };
    }

    // Check for forbidden keywords (DDL/DML operations)
    const forbiddenKeywords = [
      'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 
      'REPLACE', 'MERGE', 'CALL', 'EXEC', 'SET', 'GRANT', 'REVOKE'
    ];
    
    for (const keyword of forbiddenKeywords) {
      if (upperQuery.includes(keyword)) {
        return {
          rows: [],
          rowCount: 0,
          executedQuery,
          took_ms: Date.now() - startTime,
          error: `Forbidden operation: ${keyword} is not allowed`,
          errorCode: 'FORBIDDEN_KEYWORD'
        };
      }
    }

    // Convert named parameters to positional parameters
    let processedQuery = query;
    const namedParams: { [key: string]: string } = {};
    let paramIndex = 1;
    
    // Find named parameters (:paramName)
    const namedParamRegex = /:(\w+)/g;
    let match;
    while ((match = namedParamRegex.exec(query)) !== null) {
      const paramName = match[1];
      if (!namedParams[paramName]) {
        namedParams[paramName] = `$${paramIndex}`;
        paramIndex++;
      }
      processedQuery = processedQuery.replace(match[0], namedParams[paramName]);
    }

    // Set schema search path
    const dbSchema = process.env.DB_SCHEMA || 'public';
    await db.execute(sql.raw(`SET LOCAL search_path TO "${dbSchema}"`));

    // Execute the query with timeout (30 seconds)
    const queryPromise = db.execute(sql.raw(processedQuery));
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout (30s)')), 30000)
    );
    
    const result = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    const took_ms = Date.now() - startTime;
    const rows = Array.isArray(result) ? result : result.rows || [result];
    const rowCount = rows.length;

    // If zero results, perform triage
    if (rowCount === 0) {
      const triage = await performTriage();
      
      return {
        rows: [],
        rowCount: 0,
        executedQuery,
        took_ms,
        triage,
        error: undefined // Don't show error for zero results, let the model decide
      };
    }

    // Enforce max rows limit (5,000)
    const maxRows = 5000;
    if (rowCount > maxRows) {
      return {
        rows: rows.slice(0, maxRows),
        rowCount: maxRows,
        executedQuery,
        took_ms,
        error: `Result set truncated to ${maxRows} rows. Use filters to reduce results.`,
        errorCode: 'RESULT_TRUNCATED'
      };
    }

    return {
      rows,
      rowCount,
      executedQuery: query, // Show the corrected query
      took_ms
    };
    
  } catch (error: any) {
    const took_ms = Date.now() - startTime;
    
    // Parse PostgreSQL error codes
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = error.message || 'Query execution failed';
    
    if (error.code) {
      switch (error.code) {
        case '42P01':
          errorCode = 'RELATION_NOT_FOUND';
          errorMessage = `Table not found. ${error.message}. Try checking available tables in schema "${process.env.DB_SCHEMA || 'public'}".`;
          break;
        case '42703':
          errorCode = 'COLUMN_NOT_FOUND';
          errorMessage = `Column not found. ${error.message}`;
          break;
        case '42601':
          errorCode = 'SYNTAX_ERROR';
          errorMessage = `SQL syntax error: ${error.message}`;
          break;
        case '42501':
          errorCode = 'INSUFFICIENT_PRIVILEGE';
          errorMessage = `Access denied: ${error.message}`;
          break;
        case '23505':
          errorCode = 'UNIQUE_VIOLATION';
          errorMessage = `Unique constraint violation: ${error.message}`;
          break;
        default:
          errorCode = `PG_ERROR_${error.code}`;
          errorMessage = error.message;
      }
    }

    // For relation not found errors, include triage data
    let triage;
    if (errorCode === 'RELATION_NOT_FOUND') {
      try {
        triage = await performTriage();
      } catch (triageError) {
        // Ignore triage errors
      }
    }

    return {
      rows: [],
      rowCount: 0,
      executedQuery,
      took_ms,
      error: errorMessage,
      errorCode,
      triage
    };
  }
}

async function performTriage(): Promise<TriageData> {
  try {
    const dbSchema = process.env.DB_SCHEMA || 'public';
    
    // Get current schema
    const schemaResult = await db.execute(sql.raw('SELECT current_schema()'));
    const currentSchema = (schemaResult as any)[0]?.current_schema || dbSchema;
    
    // Get up to 50 tables in current schema
    const tablesResult = await db.execute(sql.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = '${currentSchema}'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name 
      LIMIT 50
    `));
    
    const tables = (tablesResult as any).map((row: any) => row.table_name);
    
    // Get up to 200 columns across those tables  
    const columnsResult = tables.length > 0 
      ? await db.execute(sql.raw(`
          SELECT table_name, column_name, data_type
          FROM information_schema.columns 
          WHERE table_schema = '${currentSchema}'
          AND table_name IN (${tables.map((t: string) => `'${t}'`).join(', ')})
          ORDER BY table_name, ordinal_position 
          LIMIT 200
        `))
      : [];
    
    const columns = Array.isArray(columnsResult) 
      ? (columnsResult as any).map((row: any) => ({
          table: row.table_name,
          column: row.column_name,
          type: row.data_type
        }))
      : [];
    
    return {
      schema: currentSchema,
      tables,
      columns
    };
    
  } catch (error) {
    return {
      schema: process.env.DB_SCHEMA || 'public',
      tables: [],
      columns: []
    };
  }
}