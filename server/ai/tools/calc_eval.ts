import { evaluate } from 'mathjs';

export interface CalcEvalInput {
  expression: string;
  variables?: Record<string, number>;
}

export interface CalcEvalResult {
  result: number;
  steps?: string[];
  error?: string;
}

export function calc_eval(input: CalcEvalInput): CalcEvalResult {
  try {
    const { expression, variables = {} } = input;
    
    // Sanitize expression - only allow mathematical operations
    const sanitized = expression.replace(/[^0-9+\-*/().\s\w]/g, '');
    if (!sanitized || sanitized !== expression) {
      throw new Error('Invalid characters in expression');
    }
    
    // Evaluate with variables
    const result = evaluate(sanitized, variables);
    
    return {
      result: typeof result === 'number' ? result : parseFloat(result),
      steps: [`Evaluated: ${expression}`, `Result: ${result}`]
    };
    
  } catch (error: any) {
    return {
      result: 0,
      error: error.message || 'Calculation error'
    };
  }
}