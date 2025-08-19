import OpenAI from 'openai';
import { db } from '../db';
import { aiThreads, aiMessages, aiLogs, InsertAiThread, InsertAiMessage, InsertAiLog } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { calcEval, calcEvalToolDefinition } from './tools/calcEval';
import { sqlQuery, sqlQueryToolDefinition } from './tools/sqlQuery';
import { docsSearch, docsSearchToolDefinition } from './tools/docsSearch';
import { docsGet, docsGetToolDefinition } from './tools/docsGet';
import { httpCall, httpCallToolDefinition } from './tools/httpCall';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any[];
  citations?: Citation[];
}

export interface Citation {
  type: 'calculation' | 'database' | 'document' | 'api';
  source: string;
  content?: string;
  reference?: string;
}

export interface ChatStreamChunk {
  type: 'message' | 'tool_call' | 'citation' | 'error' | 'done';
  content?: string;
  toolCall?: any;
  citation?: Citation;
  error?: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export class AIService {
  // Get or create thread
  async getOrCreateThread(userId: number, threadId?: number, title?: string, mode?: string): Promise<number> {
    if (threadId) {
      const thread = await db.query.aiThreads.findFirst({
        where: (threads, { eq, and }) => and(eq(threads.id, threadId), eq(threads.userId, userId)),
      });
      
      if (thread) {
        return thread.id;
      }
    }

    // Create new thread
    const threadData: InsertAiThread = {
      userId,
      title: title || 'New Chat',
      mode: mode || 'general',
    };

    const [newThread] = await db.insert(aiThreads).values(threadData).returning();
    return newThread.id;
  }

  // Get thread messages
  async getThreadMessages(threadId: number, userId: number): Promise<ChatMessage[]> {
    const messages = await db.query.aiMessages.findMany({
      where: (msgs, { eq }) => eq(msgs.threadId, threadId),
      orderBy: [desc(aiMessages.createdAt)],
      with: {
        thread: true,
      },
    });

    return messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      toolCalls: msg.toolCalls as any[],
      citations: msg.citations as Citation[],
    }));
  }

  // Calculate token usage cost (approximate)
  private calculateCost(usage: TokenUsage, model: string): number {
    const costs = {
      'gpt-4o': { prompt: 0.00250, completion: 0.01000 },
      'gpt-4o-mini': { prompt: 0.000150, completion: 0.000600 },
    };

    const modelCost = costs[model as keyof typeof costs] || costs['gpt-4o-mini'];
    
    return (
      (usage.prompt_tokens / 1000) * modelCost.prompt +
      (usage.completion_tokens / 1000) * modelCost.completion
    );
  }

  // Execute tool calls
  private async executeTool(toolCall: any, userId: number): Promise<{ result: any; citation?: Citation }> {
    const { name, parameters } = toolCall.function;

    try {
      switch (name) {
        case 'calc_eval':
          const calcResult = await calcEval(parameters);
          return {
            result: calcResult,
            citation: {
              type: 'calculation',
              source: 'Math Calculator',
              content: `Calculated: ${parameters.expression}`,
              reference: calcResult.steps?.join(' → '),
            },
          };

        case 'sql_query':
          const sqlResult = await sqlQuery(parameters);
          return {
            result: sqlResult,
            citation: {
              type: 'database',
              source: 'Database Query',
              content: `Executed: ${parameters.sql}`,
              reference: `${sqlResult.rows?.length || 0} rows returned`,
            },
          };

        case 'docs_search':
          const searchResult = await docsSearch(parameters, userId);
          return {
            result: searchResult,
            citation: {
              type: 'document',
              source: 'Document Search',
              content: `Searched: "${parameters.query}"`,
              reference: `${searchResult.hits?.length || 0} documents found`,
            },
          };

        case 'docs_get':
          const docResult = await docsGet(parameters, userId);
          return {
            result: docResult,
            citation: {
              type: 'document',
              source: docResult.filename || 'Document',
              content: 'Retrieved document content',
              reference: docResult.sourceUrl,
            },
          };

        case 'http_call':
          const httpResult = await httpCall(parameters);
          return {
            result: httpResult,
            citation: {
              type: 'api',
              source: 'API Call',
              content: `${parameters.method} ${parameters.endpoint}`,
              reference: `Status: ${httpResult.status}`,
            },
          };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      console.error(`Tool execution error (${name}):`, error);
      return {
        result: { error: error?.message || 'Tool execution failed' },
      };
    }
  }

  // Stream chat completion
  async *streamChat(
    userId: number,
    threadId: number,
    message: string,
    mode: string = 'general',
    model: string = 'gpt-4o-mini'
  ): AsyncGenerator<ChatStreamChunk> {
    try {
      // Store user message
      const userMessageData: InsertAiMessage = {
        threadId,
        role: 'user',
        content: message,
      };
      await db.insert(aiMessages).values(userMessageData);

      // Get recent messages for context
      const recentMessages = await this.getThreadMessages(threadId, userId);
      const contextMessages = recentMessages
        .slice(0, 20) // Last 20 messages
        .reverse()
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Add system message based on mode
      const systemMessage = this.getSystemMessage(mode);
      const messages = [systemMessage, ...contextMessages];

      // Define available tools based on mode
      const availableTools = this.getAvailableTools(mode);

      // Create completion with tools
      const stream = await openai.chat.completions.create({
        model,
        messages: messages as any,
        tools: availableTools,
        tool_choice: 'auto',
        stream: true,
        temperature: 0.1,
      });

      let assistantMessage = '';
      let toolCalls: any[] = [];
      let citations: Citation[] = [];
      let tokenUsage: TokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          assistantMessage += delta.content;
          yield {
            type: 'message',
            content: delta.content,
          };
        }

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (!toolCalls[toolCall.index]) {
              toolCalls[toolCall.index] = {
                id: toolCall.id,
                type: toolCall.type,
                function: { name: '', arguments: '' },
              };
            }

            const tc = toolCalls[toolCall.index];
            if (toolCall.function?.name) {
              tc.function.name = toolCall.function.name;
            }
            if (toolCall.function?.arguments) {
              tc.function.arguments += toolCall.function.arguments;
            }
          }
        }

        // Extract token usage from final chunk
        if (chunk.usage) {
          tokenUsage = chunk.usage;
        }
      }

      // Execute tool calls if any
      if (toolCalls.length > 0) {
        yield {
          type: 'message',
          content: '\n\n*Executing tools...*\n\n',
        };

        for (const toolCall of toolCalls) {
          try {
            const parameters = JSON.parse(toolCall.function.arguments);
            const { result, citation } = await this.executeTool(
              { function: { name: toolCall.function.name, parameters } },
              userId
            );

            yield {
              type: 'tool_call',
              toolCall: {
                name: toolCall.function.name,
                parameters,
                result,
              },
            };

            if (citation) {
              citations.push(citation);
              yield {
                type: 'citation',
                citation,
              };
            }

            // Add result to context and continue conversation
            assistantMessage += `\n\nTool Result (${toolCall.function.name}): ${JSON.stringify(result)}`;

          } catch (error: any) {
            yield {
              type: 'error',
              error: `Tool execution failed: ${error?.message || 'Unknown error'}`,
            };
          }
        }
      }

      // Store assistant message
      const assistantMessageData: InsertAiMessage = {
        threadId,
        role: 'assistant',
        content: assistantMessage,
        toolCalls,
        citations,
      };
      await db.insert(aiMessages).values(assistantMessageData);

      // Log interaction
      const cost = this.calculateCost(tokenUsage, model);
      const logData: InsertAiLog = {
        userId,
        threadId,
        role: 'assistant',
        prompt: message,
        toolCalls,
        tokenUsage,
        cost: cost.toString(),
        latency: 0, // TODO: Track actual latency
        citations,
        model,
      };
      await db.insert(aiLogs).values(logData);

      yield { type: 'done' };

    } catch (error: any) {
      console.error('Chat streaming error:', error);
      yield {
        type: 'error',
        error: error?.message || 'Chat processing failed',
      };
    }
  }

  private getSystemMessage(mode: string): { role: 'system'; content: string } {
    const basePrompt = `You are an AI assistant for bebo convert, an internal hotel pricing and analysis platform. You have access to calculations, database queries, documents, and API calls.

Always provide sources and citations when using tools. Be concise but thorough in your responses.`;

    const modePrompts = {
      general: `${basePrompt}\n\nYou can help with any task using all available tools as needed.`,
      calculation: `${basePrompt}\n\nFocus on mathematical calculations and pricing analysis. Use the calculator tool for complex calculations.`,
      docs: `${basePrompt}\n\nFocus on document analysis and search. Use document tools to find relevant information.`,
      sql: `${basePrompt}\n\nFocus on database queries and data analysis. Use SQL tools to query the database safely.`,
      sheets: `${basePrompt}\n\nFocus on spreadsheet and data analysis. (Google Sheets integration coming soon)`,
      api: `${basePrompt}\n\nFocus on API calls and external integrations. Use HTTP tools to interact with allowed endpoints.`,
    };

    return {
      role: 'system',
      content: modePrompts[mode as keyof typeof modePrompts] || modePrompts.general,
    };
  }

  private getAvailableTools(mode: string): any[] {
    const allTools = [
      calcEvalToolDefinition,
      sqlQueryToolDefinition,
      docsSearchToolDefinition,
      docsGetToolDefinition,
      httpCallToolDefinition,
    ];

    // Filter tools based on mode
    switch (mode) {
      case 'calculation':
        return [calcEvalToolDefinition];
      case 'docs':
        return [docsSearchToolDefinition, docsGetToolDefinition];
      case 'sql':
        return [sqlQueryToolDefinition];
      case 'api':
        return [httpCallToolDefinition];
      case 'sheets':
        return []; // TODO: Add Google Sheets tools
      default:
        return allTools; // General mode has access to all tools
    }
  }

  // Get user threads
  async getUserThreads(userId: number): Promise<any[]> {
    const threads = await db.query.aiThreads.findMany({
      where: (t, { eq }) => eq(t.userId, userId),
      orderBy: [desc(aiThreads.updatedAt)],
      with: {
        messages: {
          limit: 1,
          orderBy: [desc(aiMessages.createdAt)],
        },
      },
    });

    return threads.map(thread => ({
      id: thread.id,
      title: thread.title,
      mode: thread.mode,
      isPinned: thread.isPinned,
      lastMessage: thread.messages[0]?.content?.substring(0, 100) || 'No messages',
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    }));
  }

  // Update thread
  async updateThread(threadId: number, userId: number, updates: Partial<InsertAiThread>): Promise<void> {
    await db
      .update(aiThreads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiThreads.id, threadId));
  }

  // Delete thread
  async deleteThread(threadId: number, userId: number): Promise<void> {
    await db
      .delete(aiThreads)
      .where(eq(aiThreads.id, threadId));
  }
}