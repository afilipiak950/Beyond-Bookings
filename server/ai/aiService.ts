import OpenAI from 'openai';
import { db } from '../db';
import { aiThreads, aiMessages, aiLogs, InsertAiThread, InsertAiMessage, InsertAiLog } from '../../shared/schema';
import { eq, desc, and, lt, count } from 'drizzle-orm';
import { tools, toolDefinitions, executeTool, type ToolName } from './tools/index';
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
          // Use new comprehensive SQL tool
          const sqlResult = await executeTool('sql_query', parameters, userId);
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

      // Define available tools based on mode (combine old and new systems)
      const availableTools = [...this.getAvailableTools(mode), ...toolDefinitions];

      // Create completion with tools
      const stream = await openai.chat.completions.create({
        model,
        messages: messages as any,
        tools: availableTools,
        tool_choice: 'auto',
        stream: true,
        temperature: 0.1,
        max_tokens: 4000,
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
            temperature: 0.2,
            max_tokens: 1000,
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
    const basePrompt = `Du bist der interne KI-Assistent von bebo convert, einer hotelspezifischen Pricing- und Analyseplattform.

**Deine Kernkompetenzen:**
- Nutze für jede Anfrage primär OpenAI-Modelle und die verfügbaren Tools
- Liefere präzise, datenbasierte Antworten mit Quellenangaben
- Nenne Zahlen sowohl absolut als auch prozentual (z.B. "50 Hotels, +25% vs. Vormonat")
- Mache Annahmen explizit transparent ("Annahme: Betrachtungszeitraum Jan-Dez 2024")
- Stelle max. 2 präzise Rückfragen bei Unklarheiten, bevor du antwortest
- Zitiere Quellen im Format: [Quellenname]

**Function-Calling Pflicht:**
- Nutze IMMER Tools über Function-Calling für Datenabfragen
- Kombiniere mehrere Tools für umfassende Analysen
- Verifiziere wichtige Informationen durch Kreuzreferenzierung

**Lern-Mechanismus:**
- Frage-Antwort-Paare und Tool-Kontext werden gespeichert
- Negative Nutzerbewertungen triggern automatische Lernjobs
- Wissenssnippets werden kontinuierlich ergänzt und verbessert`;

    const modePrompts = {
      general: `${basePrompt}\n\n**Allgemein-Modus:** Du hilfst bei allen Aufgaben mit vollständigem Tool-Zugang. Priorisiere datenbasierte Antworten und nutze mehrere Tools kombiniert.

**VOLLSTÄNDIGE DATENBANK-ÜBERSICHT:**
- 10 Hotels in der Datenbank
- 8 Preiskalkulationen erstellt  
- 20 verschiedene Datentabellen verfügbar
- Alle Tabellen: pricing_calculations, hotels, users, approval_requests, document_analyses, ai_threads, ai_messages, notifications, feedback, sessions, price_intelligence, document_uploads, ocr_analyses, document_insights, ai_learning_sessions, ai_chunks, ai_docs, ai_embeddings

**KRITISCHER HINWEIS:** Verwende IMMER die korrekten Tabellennamen:
- pricing_calculations (NICHT calculations oder hotel_calculations!)
- hotels (für Hotelinformationen)

**ANTWORT-STIL:** Gib DETAILLIERTE, KONVERSATIONELLE Antworten. Erkläre was die Daten bedeuten, zeige Zusammenhänge und Insights auf.`,
      
      calculation: `${basePrompt}\n\n**Kalkulations-Modus:** Spezialisiert auf Hotelpreiskalkulationen, Revenue Management und Finanzanalysen. Nutze deutsche Steuerrichtlinien (19% MwSt, Gewerbesteuer, etc.). Zeige Berechnungsschritte transparent.`,
      
      docs: `${basePrompt}\n\n**Dokument-Modus:** Durchsuche und analysiere hochgeladene Dokumente. Extrahiere relevante Daten, erstelle Zusammenfassungen und vergleiche Inhalte. Zitiere spezifische Dokumentenstellen.`,
      
      sql: `${basePrompt}\n\n**Database-Modus:** Führe komplexe PostgreSQL-Abfragen durch. Analysiere Hotel-, Preis-, Kunden- und Kalkulationsdaten. Erstelle Business Intelligence Reports mit klaren Insights.

**VOLLSTÄNDIGE DATENBANK-KENNTNIS (20 Tabellen, Daten verifiziert):**

HAUPT-BUSINESS-TABELLEN:
• pricing_calculations (8 Datensätze) - Hotelpreiskalkulationen mit allen Feldern: hotel_name, stars, room_count, voucher_price, operational_costs, profit_margin, total_price, vat_amount, financing_volume, approval_status
• hotels (10 Datensätze) - Hotelinformationen mit allen Feldern: name, url, stars, room_count, location, city, country, average_price, amenities, booking_reviews, google_reviews  
• users - Benutzerkonten mit Rollen (admin, manager, user)
• approval_requests - Genehmigungsworkflow-Daten

**WICHTIGE JOIN-RELATIONSHIPS:**
- pricing_calculations.hotel_id → hotels.id
- pricing_calculations.user_id → users.id  
- approval_requests.calculation_id → pricing_calculations.id

**ANTWORT-STIL:** Liefere IMMER detaillierte, konversationelle Antworten in Deutsch. Zeige Zahlen, Insights und Zusammenhänge. Erkläre was die Daten bedeuten, nicht nur die rohen Werte.`,
      
      sheets: `${basePrompt}\n\n**Tabellen-Modus:** Analysiere Spreadsheet-Daten und erstelle Excel-Reports. (Google Sheets Integration in Entwicklung)`,
      
      api: `${basePrompt}\n\n**API-Modus:** Führe HTTP-Anfragen an externe APIs durch. Hole aktuelle Marktdaten, Preisvergleiche und Competitive Intelligence. Dokumentiere alle API-Calls.`,
    };

    return {
      role: 'system',
      content: modePrompts[mode as keyof typeof modePrompts] || modePrompts.general,
    };
  }

  private getAvailableTools(mode: string): any[] {
    // Use new comprehensive tool system
    const newTools = toolDefinitions;

    // Filter tools based on mode
    switch (mode) {
      case 'calculation':
        return newTools.filter(t => t.function.name === 'calc_eval');
      case 'docs':
        return newTools.filter(t => ['docs_search', 'docs_get'].includes(t.function.name));
      case 'sql':
        return newTools.filter(t => t.function.name === 'sql_query');
      case 'api':
        return newTools.filter(t => t.function.name === 'http_call');
      case 'sheets':
        return newTools.filter(t => t.function.name === 'sheets_read');
      default:
        return newTools; // General mode has access to all tools
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