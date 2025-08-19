import axios from 'axios';

export interface HttpCallInput {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  headers?: Record<string, string>;
}

export interface HttpCallResult {
  data: any;
  status: number;
  error?: string;
}

// Get whitelisted endpoints from environment
function getWhitelistedEndpoints(): string[] {
  const whitelist = process.env.AI_HTTP_WHITELIST || '/api/calc,/api/reports';
  return whitelist.split(',').map(endpoint => endpoint.trim());
}

export async function http_call(input: HttpCallInput): Promise<HttpCallResult> {
  try {
    const { endpoint, method, payload, headers = {} } = input;
    
    // Check if endpoint is whitelisted
    const whitelistedEndpoints = getWhitelistedEndpoints();
    const isWhitelisted = whitelistedEndpoints.some(allowed => 
      endpoint.startsWith(allowed) || endpoint.includes(allowed)
    );
    
    if (!isWhitelisted) {
      return {
        data: null,
        status: 403,
        error: `Endpoint '${endpoint}' not whitelisted. Allowed: ${whitelistedEndpoints.join(', ')}`
      };
    }
    
    // Make the HTTP call
    const response = await axios({
      method,
      url: endpoint,
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000, // 10 second timeout
    });
    
    return {
      data: response.data,
      status: response.status
    };
    
  } catch (error: any) {
    return {
      data: null,
      status: error.response?.status || 500,
      error: error.message || 'HTTP request failed'
    };
  }
}