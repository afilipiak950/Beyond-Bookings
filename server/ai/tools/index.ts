// Tool registry for AI Assistant
import { calc_eval } from './calc_eval';
import { sql_query } from './sql_query';
import { sheets_read } from './sheets_read';
import { docs_search, docs_get } from './docs_search';
import { http_call } from './http_call';
import { feedback_submit } from './feedback_submit';

export const tools = {
  calc_eval,
  sql_query,
  sheets_read,
  docs_search,
  docs_get,
  http_call,
  feedback_submit,
};

export type ToolName = keyof typeof tools;

// Tool definitions for OpenAI function calling
export const toolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'calc_eval',
      description: 'Evaluate mathematical expressions safely using mathjs. Supports variables and returns steps.',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Mathematical expression to evaluate' },
          variables: { type: 'object', description: 'Variables to use in the expression' }
        },
        required: ['expression']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'sql_query',
      description: 'Execute SELECT queries against the database. Only SELECT statements are allowed for security.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'SQL SELECT query to execute' },
          params: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Parameters for the query (optional)' 
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'sheets_read',
      description: 'Read data from Google Sheets. Requires proper authentication.',
      parameters: {
        type: 'object',
        properties: {
          spreadsheetId: { type: 'string', description: 'Google Sheets spreadsheet ID' },
          range: { type: 'string', description: 'Range to read (e.g., "Sheet1!A1:C10")' }
        },
        required: ['spreadsheetId', 'range']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'docs_search',
      description: 'Search through uploaded documents using semantic search.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          topK: { type: 'number', description: 'Number of results to return' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'docs_get',
      description: 'Get full content of a document or specific chunk.',
      parameters: {
        type: 'object',
        properties: {
          docId: { type: 'number', description: 'Document ID' },
          chunkId: { type: 'number', description: 'Specific chunk ID (optional)' }
        },
        required: ['docId']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'http_call',
      description: 'Make HTTP requests to whitelisted endpoints.',
      parameters: {
        type: 'object',
        properties: {
          endpoint: { type: 'string', description: 'URL endpoint to call' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
          payload: { type: 'object', description: 'Request payload for POST/PUT' }
        },
        required: ['endpoint', 'method']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'feedback_submit',
      description: 'Submit user feedback for the AI assistant.',
      parameters: {
        type: 'object',
        properties: {
          threadId: { type: 'number', description: 'Thread ID' },
          rating: { type: 'string', enum: ['up', 'down'] },
          comment: { type: 'string', description: 'Optional feedback comment' }
        },
        required: ['threadId', 'rating']
      }
    }
  }
];

// Execute a tool by name
export async function executeTool(name: ToolName, input: any, userId?: number): Promise<any> {
  try {
    const tool = tools[name];
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    
    // Add userId to input if available
    if (userId && typeof input === 'object') {
      input.userId = userId;
    }
    
    return await tool(input);
  } catch (error: any) {
    return {
      error: error.message || 'Tool execution failed'
    };
  }
}