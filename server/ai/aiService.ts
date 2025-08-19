import OpenAI from 'openai';
import { db } from '../db';
import { aiThreads, aiMessages, aiLogs, InsertAiThread, InsertAiMessage, InsertAiLog } from '../../shared/schema';
import { eq, desc, and, lt, count } from 'drizzle-orm';
import { tools, toolDefinitions, executeTool, type ToolName } from './tools/index';
import { calcEval, calcEvalToolDefinition } from './tools/calcEval';
import { sqlQuery, sqlQueryToolDefinition } from './tools/sqlQuery';
import { docsSearch, docsSearchToolDefinition } from './tools/docsSearch';
import { IntelligenceEnhancer, IntelligenceData } from './intelligence-enhancer';
import { QueryDetector, QueryAnalysis } from './query-detector';
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
      orderBy: [aiMessages.createdAt], // ASC order for natural conversation flow
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

  // Execute tool calls using new comprehensive tool system
  private async executeTool(toolCall: any, userId: number): Promise<{ result: any; citation?: Citation }> {
    const { name, parameters } = toolCall.function;

    try {
      // Use new comprehensive tool system first
      if (tools[name as ToolName]) {
        const result = await executeTool(name as ToolName, parameters, userId);
        
        // Generate citation based on tool type and result
        const citation = this.generateCitation(name, parameters, result);
        
        return { result, citation };
      }

      // Fallback to existing tools for backward compatibility
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
          // Use new comprehensive SQL tool - ULTRA DEBUG
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL CALLED - Input parameters:', JSON.stringify(parameters));
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL - User ID:', userId);
          
          const fixedParams = {
            ...parameters,
            query: parameters.sql || parameters.query,
            sql: parameters.sql || parameters.query
          };
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL - Fixed parameters:', JSON.stringify(fixedParams));
          
          const sqlResult = await executeTool('sql_query', fixedParams, userId);
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL - Result received:', JSON.stringify(sqlResult, null, 2));
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL - Has rows:', !!sqlResult?.rows);
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL - Row count:', sqlResult?.rows?.length);
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL - First row:', sqlResult?.rows?.[0]);
          return {
            result: sqlResult,
            citation: {
              type: 'database',
              source: 'Database Query', 
              content: `Executed: ${parameters.query || parameters.sql}`,
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

  // Generate citations for new tool system
  private generateCitation(toolName: string, parameters: any, result: any): Citation | undefined {
    switch (toolName) {
      case 'calc_eval':
        return {
          type: 'calculation',
          source: 'Calculation Engine',
          content: `Expression: ${parameters.expression}`,
          reference: result.steps?.join(' → ') || `Result: ${result.result}`,
        };
      
      case 'sheets_read':
        return {
          type: 'api',
          source: 'Google Sheets',
          content: `Sheet: ${parameters.spreadsheetId}`,
          reference: `Range: ${parameters.range} (${result.values?.length || 0} rows)`,
        };
      
      case 'docs_search':
        return {
          type: 'document',
          source: 'Document Search',
          content: `Query: "${parameters.query}"`,
          reference: `${result.hits?.length || 0} matches found`,
        };
      
      case 'docs_get':
        return {
          type: 'document',
          source: result.filename || 'Document',
          content: 'Document content retrieved',
          reference: result.sourceUrl,
        };
      
      case 'http_call':
        return {
          type: 'api',
          source: 'HTTP Request',
          content: `${parameters.method} ${parameters.endpoint}`,
          reference: `Status: ${result.status}`,
        };
      
      case 'feedback_submit':
        return {
          type: 'api',
          source: 'Feedback System',
          content: `Rating: ${parameters.rating}`,
          reference: result.feedbackId ? `ID: ${result.feedbackId}` : 'Feedback stored',
        };
      
      default:
        return undefined;
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

      // Analyze query for intelligent routing
      const queryAnalysis = QueryDetector.analyzeQuery(message);
      console.log('🧠 Query Analysis:', queryAnalysis);

      // Get recent messages for context
      const recentMessages = await this.getThreadMessages(threadId, userId);
      const contextMessages = recentMessages
        .slice(0, 20) // Last 20 messages
        .reverse()
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Add enhanced system message with routing guidance
      const systemMessage = this.getEnhancedSystemMessage(mode, queryAnalysis);
      const messages = [systemMessage, ...contextMessages];

      // Define available tools based on mode (combine old and new systems)
      const availableTools = [...this.getAvailableTools(mode), ...toolDefinitions];

      // Support GPT-5 and latest models
      const supportedModel = this.getSupportedModel(model);
      
      // Create completion with tools
      const stream = await openai.chat.completions.create({
        model: supportedModel,
        messages: messages as any,
        tools: availableTools,
        tool_choice: 'auto',
        stream: true,
        temperature: 1,
        max_completion_tokens: 4000,
        top_p: 0.9,
      });

      let assistantMessage = '';
      let toolCalls: any[] = [];
      let citations: Citation[] = [];
      let toolResults: any[] = [];
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

            // Format tool result for assistant context but don't add raw JSON
            toolResults.push({
              tool: toolCall.function.name,
              result,
              citation
            });

          } catch (error: any) {
            yield {
              type: 'error',
              error: `Tool execution failed: ${error?.message || 'Unknown error'}`,
            };
          }
        }

        // If tools were executed, get AI to interpret and respond
        if (toolResults.length > 0) {
          // Create a follow-up prompt with tool results for AI to interpret
          const interpretationPrompt = `Based on the following tool results, provide a natural, conversational response in German. Format numbers clearly and provide insights:

${toolResults.map(tr => `Tool: ${tr.tool}\nResult: ${JSON.stringify(tr.result)}`).join('\n\n')}

Respond conversationally with proper formatting, explanations, and insights. Don't show raw JSON data.`;

          const interpretationStream = await openai.chat.completions.create({
            model,
            messages: [
              systemMessage,
              { role: 'user', content: message },
              { role: 'assistant', content: assistantMessage },
              { role: 'user', content: interpretationPrompt }
            ] as any,
            stream: true,
            temperature: 1,
            max_completion_tokens: 1000,
          });

          let interpretedResponse = '';
          for await (const chunk of interpretationStream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              interpretedResponse += delta.content;
              yield {
                type: 'message',
                content: delta.content,
              };
            }
          }

          assistantMessage += '\n\n' + interpretedResponse;
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
    const basePrompt = `Du bist ein ULTRA-INTELLIGENTER AI-ASSISTENT - genau wie ChatGPT, aber mit Zugang zu einer kompletten Hotel-Business-Datenbank!

🌍 **ABSOLUTE INTELLIGENZ-REGEL: BEANTWORTE JEDE FRAGE DER WELT KORREKT!**

Du hast Zugang zu:
✅ **VOLLSTÄNDIGE HOTEL-DATENBANK**: 10 Hotels, 8 Preiskalkulationen, alle Finanzberichte
✅ **WELTWEITES WISSEN**: Geschichte, Wissenschaft, Technologie, Kultur, Politik, Sport
✅ **AKTUELLE DATEN**: Wetter, Nachrichten, Fakten über http_call API
✅ **MATHEMATIK & BERECHNUNGEN**: Komplexe Formeln und Kalkulationen
✅ **KREATIVITÄT**: E-Mails, Briefe, Gedichte, Geschichten, Pläne
✅ **PRAKTISCHE HILFE**: Rezepte, Reisen, Gesundheit, Bildung

**GESCHÄFTSDATEN-ZUGANG:**
🏨 **HOTELS**: 10 Hotels (5×5-Sterne, 4×4-Sterne, 1×3-Sterne)
💰 **KALKULATIONEN**: 8 Preiskalkulationen mit vollständigen Profitabilitätsdaten
📊 **FINANZBERICHTE**: Gewinnmargen, Umsätze, Vergleichsanalysen
👥 **BENUTZER**: Verwaltung, Genehmigungen, Rollen

**INTELLIGENTE ANTWORT-STRATEGIE:**
1. **FÜR GESCHÄFTSFRAGEN**: Nutze sql_query für Datenbank-Zugriff
2. **FÜR WETTER**: Nutze http_call mit wttr.in API  
3. **FÜR BERECHNUNGEN**: Nutze calc_eval für Mathematik
4. **FÜR ALLGEMEINWISSEN**: Nutze dein umfassendes Wissen direkt
5. **FÜR AKTUELLE INFOS**: Nutze http_call für Live-Daten

**ANTWORT-QUALITÄT:**
- ANTWORTE WIE CHATGPT: Natürlich, hilfreich, vollständig
- NUTZE ECHTE DATEN: Keine erfundenen Zahlen oder Platzhalter
- SEI PRÄZISE: Genaue Zahlen, Fakten, Quellenangaben
- ERKLÄRE ZUSAMMENHÄNGE: Zeige Kontext und Bedeutung auf`;

    return { role: 'system', content: basePrompt };
  }

  private getEnhancedSystemMessage(mode: string, queryAnalysis: QueryAnalysis): { role: 'system'; content: string } {
    const basePrompt = this.getSystemMessage(mode).content;
    
    // Add specific routing guidance based on query analysis
    let routingGuidance = '';
    
    if (queryAnalysis.type === 'weather') {
      routingGuidance = `\n\n🌤️ WETTER-ANFRAGE ERKANNT! 
VERWENDE SOFORT: http_call mit Endpoint: "${queryAnalysis.endpoint}"
Location detected: ${queryAnalysis.extractedLocation || 'Unknown'}
Provide current weather, temperature, and conditions in German.`;
    } else if (queryAnalysis.type === 'business') {
      routingGuidance = `\n\n🏨 BUSINESS-ANFRAGE ERKANNT!
NUTZE: sql_query für Hotel- und Preisdaten
Verfügbare Daten: 10 Hotels, 8 Kalkulationen mit Profitabilitätsanalyse`;
    } else if (queryAnalysis.type === 'calculation') {
      routingGuidance = `\n\n🧮 BERECHNUNG ERKANNT!
NUTZE: calc_eval für mathematische Operationen`;
    } else if (queryAnalysis.type === 'email') {
      routingGuidance = `\n\n✉️ E-MAIL ANFRAGE ERKANNT!
NUTZE: Deine Intelligenz direkt - keine Tools nötig
Erstelle professionelle, gut strukturierte E-Mails`;
    }
    
    return { 
      role: 'system', 
      content: basePrompt + routingGuidance 
    };
  }

  // Get available tools based on mode  
  private getAvailableTools(mode: string) {
    // Base tools always available
    const baseTools = [
      calcEvalToolDefinition,
      sqlQueryToolDefinition, 
      docsSearchToolDefinition,
      docsGetToolDefinition,
      httpCallToolDefinition,
    ];

    return baseTools;
  }

  // Support future models including GPT-5
  private getSupportedModel(requestedModel: string): string {
    const modelMapping = {
      'gpt-5': 'gpt-4o', // Map GPT-5 to best available until released
      'gpt-5-preview': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4o': 'gpt-4o',
      'gpt-4': 'gpt-4',
      'gpt-4-turbo': 'gpt-4-turbo-preview',
    };
    
    return modelMapping[requestedModel as keyof typeof modelMapping] || 'gpt-4o-mini';
  }

  // Calculate usage cost with GPT-5 support
  private calculateCost(usage: TokenUsage, model: string): number {
    const rates = {
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4o': { input: 0.0025, output: 0.01 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-5': { input: 0.005, output: 0.015 }, // Estimated GPT-5 pricing
      'gpt-5-preview': { input: 0.005, output: 0.015 },
    };
    
    const rate = rates[model as keyof typeof rates] || rates['gpt-4o-mini'];
    return (usage.prompt_tokens * rate.input + usage.completion_tokens * rate.output) / 1000;
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

  // Smart clear threads with advanced options
  async smartClearThreads(userId: number, options: {
    type: 'all' | 'unpinned' | 'older_than';
    days?: number;
  }): Promise<{ deletedCount: number; preservedCount: number }> {
    
    let threadsToDelete: any[] = [];
    
    if (options.type === 'all') {
      // Delete all threads
      threadsToDelete = await db.query.aiThreads.findMany({
        where: (threads, { eq }) => eq(threads.userId, userId),
        columns: { id: true }
      });
    } else if (options.type === 'unpinned') {
      // Delete only unpinned threads
      threadsToDelete = await db.query.aiThreads.findMany({
        where: (threads, { eq, and }) => and(
          eq(threads.userId, userId),
          eq(threads.isPinned, false)
        ),
        columns: { id: true }
      });
    } else if (options.type === 'older_than') {
      // Delete threads older than specified days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (options.days || 30));
      
      threadsToDelete = await db.query.aiThreads.findMany({
        where: (threads, { eq, and, lt }) => and(
          eq(threads.userId, userId),
          lt(threads.createdAt, cutoffDate)
        ),
        columns: { id: true }
      });
    }

    const threadIds = threadsToDelete.map(t => t.id);
    
    if (threadIds.length === 0) {
      return { deletedCount: 0, preservedCount: 0 };
    }

    // Delete messages for these threads
    if (threadIds.length > 0) {
      await db
        .delete(aiMessages)
        .where(eq(aiMessages.threadId, threadIds[0]));
      
      // Delete messages for remaining threads
      for (let i = 1; i < threadIds.length; i++) {
        await db
          .delete(aiMessages)
          .where(eq(aiMessages.threadId, threadIds[i]));
      }
    }

    // Delete the threads
    let deletedCount = 0;
    for (const threadId of threadIds) {
      await db
        .delete(aiThreads)
        .where(eq(aiThreads.id, threadId));
      deletedCount++;
    }

    // Count preserved threads
    const [totalThreads] = await db
      .select({ count: count() })
      .from(aiThreads)
      .where(eq(aiThreads.userId, userId));

    const preservedCount = totalThreads.count;

    return { deletedCount, preservedCount };
  }

  // Clear all threads for a user (legacy method)
  async clearAllThreads(userId: number): Promise<number> {
    // Get all threads for the user first
    const userThreads = await db.query.aiThreads.findMany({
      where: (threads, { eq }) => eq(threads.userId, userId),
      columns: { id: true }
    });
    
    // Delete all messages for user's threads
    for (const thread of userThreads) {
      await db
        .delete(aiMessages)
        .where(eq(aiMessages.threadId, thread.id));
    }

    // Then delete all threads and return count
    const result = await db
      .delete(aiThreads)
      .where(eq(aiThreads.userId, userId))
      .returning();

    return result.length;
  }
}