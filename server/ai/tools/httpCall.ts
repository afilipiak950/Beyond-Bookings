import axios from 'axios';
import { z } from 'zod';

export const httpCallSchema = z.object({
  endpoint: z.string().url(),
  method: z.enum(['GET', 'POST']),
  payload: z.any().optional(),
});

export type HttpCallParams = z.infer<typeof httpCallSchema>;

export interface HttpCallResult {
  data: any;
  status: number;
  error?: string;
}

// Whitelist of allowed endpoints from environment
const getAllowedEndpoints = (): string[] => {
  const whitelist = process.env.AIHUB_HTTP_WHITELIST || '/api/calc,/api/reports';
  return whitelist.split(',').map(endpoint => endpoint.trim());
};

function isEndpointAllowed(endpoint: string): boolean {
  const allowedEndpoints = getAllowedEndpoints();
  
  // Check if the endpoint path is in the whitelist
  try {
    const url = new URL(endpoint);
    const path = url.pathname;
    
    return allowedEndpoints.some(allowed => 
      path === allowed || path.startsWith(allowed + '/')
    );
  } catch {
    // If it's not a full URL, check if it's a relative path
    return allowedEndpoints.some(allowed => 
      endpoint === allowed || endpoint.startsWith(allowed + '/')
    );
  }
}

export async function httpCall(params: HttpCallParams): Promise<HttpCallResult> {
  try {
    const { endpoint, method, payload } = params;
    
    // Security check: endpoint must be whitelisted
    if (!isEndpointAllowed(endpoint)) {
      return {
        data: null,
        status: 403,
        error: `Endpoint not whitelisted. Allowed endpoints: ${getAllowedEndpoints().join(', ')}`
      };
    }
    
    // Make the HTTP request with timeout
    const config = {
      method,
      url: endpoint,
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Hub/1.0',
      },
      ...(method === 'POST' && payload ? { data: payload } : {}),
    };
    
    const response = await axios(config);
    
    return {
      data: response.data,
      status: response.status,
    };
    
  } catch (error) {
    console.error('HTTP Call error:', error);
    
    if (axios.isAxiosError(error)) {
      return {
        data: error.response?.data || null,
        status: error.response?.status || 500,
        error: error.message,
      };
    }
    
    return {
      data: null,
      status: 500,
      error: error.message || 'Unknown HTTP error',
    };
  }
}

export const httpCallToolDefinition = {
  type: 'function',
  function: {
    name: 'http_call',
    description: 'Make HTTP requests to whitelisted internal API endpoints.',
    parameters: {
      type: 'object',
      properties: {
        endpoint: {
          type: 'string',
          description: 'API endpoint to call (must be whitelisted)'
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST'],
          description: 'HTTP method to use',
          default: 'GET'
        },
        payload: {
          type: 'object',
          description: 'Request payload for POST requests',
          nullable: true
        }
      },
      required: ['endpoint']
    }
  }
};