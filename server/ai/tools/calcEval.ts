import { evaluate, createUnit } from 'mathjs';
import { z } from 'zod';

export const calcEvalSchema = z.object({
  expression: z.string().min(1, "Expression cannot be empty"),
  variables: z.record(z.union([z.number(), z.string()])).optional(),
});

export type CalcEvalParams = z.infer<typeof calcEvalSchema>;

export interface CalcEvalResult {
  result: number | string;
  steps?: string[];
  error?: string;
}

export async function calcEval(params: CalcEvalParams): Promise<CalcEvalResult> {
  try {
    const { expression, variables = {} } = params;
    
    // Sanitize expression - only allow mathematical operations
    const sanitizedExpression = expression
      .replace(/[^0-9+\-*/().%, a-zA-Z_]/g, '')
      .trim();
    
    if (!sanitizedExpression) {
      return { 
        result: 'Error', 
        error: 'Invalid expression after sanitization' 
      };
    }

    // Create a custom scope with variables
    const scope = { ...variables };
    
    // Steps tracking
    const steps: string[] = [];
    
    // Add variable substitutions to steps
    if (Object.keys(variables).length > 0) {
      steps.push(`Variables: ${Object.entries(variables).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    }
    
    // Evaluate the expression safely
    const result = evaluate(sanitizedExpression, scope);
    
    steps.push(`Expression: ${sanitizedExpression}`);
    steps.push(`Result: ${result}`);
    
    return {
      result: typeof result === 'number' ? Math.round(result * 100) / 100 : result,
      steps
    };
    
  } catch (error) {
    console.error('Calculation error:', error);
    return {
      result: 'Error',
      error: error.message || 'Unknown calculation error',
      steps: [`Failed to evaluate: ${params.expression}`]
    };
  }
}

export const calcEvalToolDefinition = {
  type: 'function',
  function: {
    name: 'calc_eval',
    description: 'Safely evaluate mathematical expressions with optional variables. Supports basic arithmetic, percentages, and units.',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate (e.g., "2 + 3 * 4", "sqrt(16)", "25% * 100")'
        },
        variables: {
          type: 'object',
          description: 'Optional variables to use in the expression',
          additionalProperties: {
            oneOf: [
              { type: 'number' },
              { type: 'string' }
            ]
          }
        }
      },
      required: ['expression']
    }
  }
};