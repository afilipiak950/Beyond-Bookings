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
import { HotelContextManager } from './hotel-context-manager';
import { IntelligentDetector } from './intelligent-detector';
import { SemanticClassifier } from './semantic-classifier';

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
          console.log('🔥🔥🔥 AI SERVICE SQL TOOL - Context:', parameters.context);
          
          // CRITICAL: Preserve context from enhanced parameters
          const fixedParams = {
            ...parameters,
            query: parameters.sql || parameters.query,
            sql: parameters.sql || parameters.query,
            context: parameters.context, // PRESERVE THE CONTEXT!
            userId: parameters.userId || userId
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
      
      // Track hotel context from user message
      HotelContextManager.trackMessage('user', message);

      // 🚀 ULTRA-SIMPLE INTELLIGENT ROUTING
      console.log('🎯 USER MESSAGE:', message);

      // 🎯 DEBUG MESSAGE ANALYSIS
      console.log('🔍 ANALYZING MESSAGE:', `"${message}"`);
      console.log('🔍 MESSAGE LOWERCASE:', `"${message.toLowerCase()}"`);
      
      // 🧠 SEMANTIC AI CLASSIFICATION (replaces keyword-based detection)
      console.log('🧠 SEMANTIC CLASSIFICATION - Using AI intelligence instead of keywords');
      const classification = await SemanticClassifier.classifyMessage(message);
      
      console.log('🔍 AI CLASSIFICATION RESULT:', {
        type: classification.type,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        shouldUseTools: classification.shouldUseTools
      });
      
      // Map classification to boolean flags
      const isWeatherQuery = classification.type === 'weather';
      const isHotelQuery = classification.type === 'hotel_business';
      const isCalculationQuery = classification.type === 'calculation';
      
      // Override for SQL mode
      const forcedHotelMode = mode === 'sql';
      const finalIsHotelQuery = isHotelQuery || forcedHotelMode;
      
      console.log('🔧 FINAL CLASSIFICATION DECISION:', {
        weather: isWeatherQuery,
        hotel: isHotelQuery,
        calculation: isCalculationQuery,
        finalHotel: finalIsHotelQuery,
        forced: forcedHotelMode,
        mode: mode
      });
      
      // 🚨 CRITICAL DEBUG: For general questions, NO CONTEXT
      let contextMessages: any[] = [];
      
      if (finalIsHotelQuery) {
        // CRITICAL FIX: Only get HOTEL-RELATED context, filter out weather/general questions
        const recentMessages = await this.getThreadMessages(threadId, userId);
        contextMessages = recentMessages
          .slice(0, 5)
          .reverse()
          .filter(msg => {
            // Only include messages that are hotel/business related, exclude weather/general
            const content = msg.content.toLowerCase();
            const isWeatherMsg = content.includes('wetter') || content.includes('weather') || content.includes('düsseldorf');
            const isHotelMsg = content.includes('hotel') || content.includes('dolder') || content.includes('kalkulation') || msg.role === 'user';
            return !isWeatherMsg || isHotelMsg;
          })
          .map(msg => ({
            role: msg.role,
            content: msg.content,
          }));
        console.log('🏨 HOTEL CONTEXT (filtered):', contextMessages.length, 'messages');
      } else {
        // General questions get ZERO context to prevent confusion
        console.log('🧠 GENERAL QUESTION - NO CONTEXT PROVIDED');
      }

      // CRITICAL: Use semantic AI detection for system message
      const systemMessage = this.getSimpleSystemMessage(isWeatherQuery, isHotelQuery || finalIsHotelQuery, message);
      const messages = [systemMessage, ...contextMessages];
      
      console.log('🔍 FINAL MESSAGES TO OPENAI:', {
        messageCount: messages.length,
        systemPrompt: systemMessage.content.substring(0, 100) + '...',
        contextCount: contextMessages.length,
        currentQuestion: message
      });
      
      // 🚨 CRITICAL: CLEAR TOOL LOGIC
      // Hotel queries = OpenAI + SQL tools
      // Calculations = OpenAI + calc_eval tools  
      // General questions = OpenAI ONLY (no tools)
      // CRITICAL FIX: Hotel business queries MUST use tools regardless of general mode
      // CRITICAL: Semantic AI overrides - hotel business queries ALWAYS get tools
      const semanticShouldUseTools = isHotelQuery || isCalculationQuery;
      const shouldUseTools = finalIsHotelQuery || semanticShouldUseTools;
      
      console.log('🔧 TOOL DECISION LOGIC:', {
        semanticHotelQuery: isHotelQuery,
        finalIsHotelQuery: finalIsHotelQuery,
        isCalculationQuery: isCalculationQuery,
        semanticShouldUseTools: semanticShouldUseTools,
        shouldUseTools: shouldUseTools,
        strategy: shouldUseTools ? (isHotelQuery || finalIsHotelQuery ? 'OpenAI + SQL' : 'OpenAI + Calc') : 'OpenAI Only'
      });

      // 🚀 INTELLIGENT TOOL SELECTION - Only provide tools when needed
      const availableTools = shouldUseTools ? toolDefinitions : [];
      console.log('🧠 INTELLIGENT MODE - Tools available:', shouldUseTools, 'Tools count:', availableTools.length);

      // Support GPT-5 and latest models
      const supportedModel = this.getSupportedModel(model);
      
      // Create completion with conditional tools
      const completionOptions: any = {
        model: supportedModel,
        messages: messages as any,
        stream: true,
        max_completion_tokens: 4000,
      };
      
      // Only add parameters that are supported by the model
      if (!supportedModel.startsWith('gpt-5')) {
        // GPT-4 models support these parameters
        completionOptions.temperature = 1;
        completionOptions.top_p = 0.9;
      }
      
      // Only add tools if needed
      if (shouldUseTools && availableTools.length > 0) {
        completionOptions.tools = availableTools;
        completionOptions.tool_choice = 'auto';
      }
      
      console.log('🚀 CALLING OPENAI API with options:', {
        model: completionOptions.model,
        hasTools: !!completionOptions.tools,
        toolCount: completionOptions.tools?.length || 0,
        messageText: message.substring(0, 50)
      });

      const stream = await openai.chat.completions.create(completionOptions);

      let assistantMessage = '';
      let toolCalls: any[] = [];
      
      console.log('✅ OPENAI STREAM CREATED for question:', message.substring(0, 50));
      let citations: Citation[] = [];
      let toolResults: any[] = [];
      let tokenUsage: TokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      for await (const chunk of stream as any) {
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
      console.log('🎯🎯🎯 AI SERVICE - Tool calls detected:', toolCalls.length);
      console.log('🔍 TOOL CALLS DETAILS:', toolCalls.map(tc => ({
        name: tc.function?.name,
        args: tc.function?.arguments
      })));
      console.log('📝 ASSISTANT MESSAGE PREVIEW:', assistantMessage.substring(0, 100) + '...');
      console.log('❓ ORIGINAL QUESTION WAS:', message);
      
      if (toolCalls.length > 0) {
        console.log('🎯🎯🎯 AI SERVICE - Executing tools:', toolCalls.map(tc => tc.function?.name));
        
        // 🚨 CRITICAL VALIDATION - Check for wrong tool usage
        for (const toolCall of toolCalls) {
          if (toolCall.function?.name === 'calc_eval' && (message.includes('wetter') || message.includes('weather') || message.includes('düsseldorf'))) {
            console.error('🚨🚨🚨 CRITICAL ERROR: calc_eval chosen for weather question!');
            console.error('🚨 Message:', message);
            console.error('🚨 Tool:', toolCall.function.name);
            console.error('🚨 Args:', toolCall.function.arguments);
          }
        }
        yield {
          type: 'message',
          content: '\n\n*Executing tools...*\n\n',
        };

        for (const toolCall of toolCalls) {
          try {
            const parameters = JSON.parse(toolCall.function.arguments);
            console.log('🎯🎯🎯 AI SERVICE - Executing tool:', toolCall.function.name, 'with params:', parameters);
            
            // 🎯 SIMPLE TOOL CONTEXT
            const enhancedParams = {
              ...parameters,
              userId,
              context: message
            };
            
            const { result, citation } = await this.executeTool(
              { function: { name: toolCall.function.name, parameters: enhancedParams } },
              userId
            );
            console.log('🎯🎯🎯 AI SERVICE - Tool result received:', !!result, result?.rows?.length);

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

        // CRITICAL: Generate follow-up response with tool results
        if (toolResults.length > 0) {
          console.log('🎯 GENERATING FOLLOW-UP RESPONSE WITH TOOL RESULTS');
          
          // Create comprehensive follow-up prompt
          const toolSummary = toolResults.map(tr => {
            if (tr.tool === 'sql_query' && tr.result?.rows) {
              return `SQL Query Results: Found ${tr.result.rows.length} records\n${JSON.stringify(tr.result.rows, null, 2)}`;
            }
            return `${tr.tool}: ${JSON.stringify(tr.result)}`;
          }).join('\n\n');
          
          const followUpPrompt = `Based on the tool results below, provide a comprehensive German response to the original question: "${message}"

Tool Results:
${toolSummary}

Please provide a detailed, informative response in German that interprets and explains this data.`;

          // Generate follow-up response 
          const followUpStream = await openai.chat.completions.create({
            model: supportedModel,
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant. Provide detailed responses in German based on data provided.'
              },
              {
                role: 'user', 
                content: followUpPrompt
              }
            ],
            stream: true,
            max_completion_tokens: 2000
          });

          // Stream the follow-up response
          for await (const chunk of followUpStream as any) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              assistantMessage += delta.content;
              yield {
                type: 'message',
                content: delta.content,
              };
            }
          }
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

          assistantMessage += interpretedResponse;
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
✅ **BERECHNUNGEN**: Mathematik, Finanzen, Statistik über calc_eval Tool
✅ **KREATIVITÄT**: E-Mails, Briefe, Gedichte, Geschichten, Pläne
✅ **PRAKTISCHE HILFE**: Rezepte, Reisen, Gesundheit, Bildung

**GESCHÄFTSDATEN-ZUGANG:**
🏨 **HOTELS**: 10 Hotels (5×5-Sterne, 4×4-Sterne, 1×3-Sterne)
💰 **KALKULATIONEN**: 8 Preiskalkulationen mit vollständigen Profitabilitätsdaten
📊 **FINANZBERICHTE**: Gewinnmargen, Umsätze, Vergleichsanalysen
👥 **BENUTZER**: Verwaltung, Genehmigungen, Rollen

**🚨 ABSOLUT KRITISCH - SQL HOTEL-SUCHE - IMMER DEN RICHTIGEN HOTELNAMEN VERWENDEN! 🚨**

WICHTIGSTE REGEL: EXTRAHIERE IMMER DEN HOTELNAMEN AUS DER NUTZERANFRAGE!

Wenn der Nutzer fragt:
- "show me vier jahreszeiten hamburg" → SUCHE NACH: '%vier jahreszeiten%' ODER '%hamburg%'
- "zeige mir marriott frankfurt" → SUCHE NACH: '%marriott%' ODER '%frankfurt%'  
- "dolder grand details" → SUCHE NACH: '%dolder%'

**NIEMALS STANDARDMÄSSIG DOLDER GRAND VERWENDEN!**

SQL-QUERY KONSTRUKTION:
1. PARSE die Nutzeranfrage für Hotelnamen/Stadt
2. KONSTRUIERE SQL mit dem EXTRAHIERTEN Namen:
   - Nutzer fragt nach "vier jahreszeiten hamburg"
   - KORREKT: SELECT * FROM pricing_calculations WHERE LOWER(hotel_name) LIKE '%vier jahreszeiten%' 
   - FALSCH: WHERE LOWER(hotel_name) LIKE '%dolder grand%' wenn nicht danach gefragt!
3. Wenn KEIN spezifisches Hotel erwähnt → zeige ALLE Hotels
4. Wenn Hotel nicht gefunden → Liste verfügbare Hotels auf

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

  private getEnhancedSystemMessage(mode: string, queryAnalysis: QueryAnalysis, message: string, hotelContext?: string): { role: 'system'; content: string } {
    const basePrompt = this.getSystemMessage(mode).content;
    
    // Add specific routing guidance based on query analysis
    let routingGuidance = '';
    
    // 🔥 CRITICAL: If we have hotel context from previous messages, ALWAYS use it!
    let contextGuidance = '';
    if (hotelContext) {
      // Get the actual hotel data from HotelContextManager
      const hotelData = HotelContextManager.getHotelData(hotelContext);
      
      if (hotelData) {
        contextGuidance = `\n\n🔥🔥🔥 ABSOLUT KRITISCHER KONTEXT - DIES IST DER WICHTIGSTE TEIL! 🔥🔥🔥
      
⚠️⚠️⚠️ ACHTUNG: DIE AKTUELLE UNTERHALTUNG BEHANDELT: "${hotelData.name}" ⚠️⚠️⚠️

🚨 UNUMSTÖSSLICHE REGEL:
Wenn der Nutzer nach einer E-Mail, Zusammenfassung, Brief oder IRGENDETWAS fragt,
MUSST DU DIE DATEN VON "${hotelData.name}" VERWENDEN!

EXAKTE HOTELDATEN (NUR DIESE VERWENDEN!):
- Hotel: ${hotelData.name} (${hotelData.stars} Sterne)
- Zimmer: ${hotelData.rooms}
- Belegungsrate: ${hotelData.occupancyRate}
- Durchschnittspreis: ${hotelData.averagePrice}
- Voucher: ${hotelData.voucherPrice}
- Betriebskosten: ${hotelData.operationalCosts}
- MwSt: ${hotelData.vatRate} (Betrag: ${hotelData.vatAmount})
- Gewinnmarge: ${hotelData.profitMargin}
- Gesamtpreis: ${hotelData.totalPrice}
- Rabatt: ${hotelData.discountVsMarket}

🔴 VERBOTEN:
- NIEMALS Daten von anderen Hotels verwenden
- NIEMALS Hotels verwechseln oder mischen
- NIEMALS generische Daten erfinden
- NIEMALS "The Dolder Grand" erwähnen wenn über "${hotelData.name}" gesprochen wird

✅ KORREKT:
- IMMER "${hotelData.name}" Daten verwenden
- IMMER den Namen "${hotelData.name}" in der E-Mail/Brief erwähnen
- IMMER die spezifischen Zahlen von "${hotelData.name}" nutzen

Beispiele was der Nutzer sagen könnte:
- "generiere eine E-Mail an Alex" → E-Mail MUSS über "${hotelData.name}" sein mit EXAKT DIESEN DATEN
- "schreibe das in einem Brief" → Brief MUSS über "${hotelData.name}" sein mit EXAKT DIESEN DATEN
- "fasse die Daten zusammen" → Zusammenfassung MUSS über "${hotelData.name}" sein mit EXAKT DIESEN DATEN

⚠️ WENN DU DAS FALSCHE HOTEL VERWENDEST, IST DAS EIN KRITISCHER FEHLER! ⚠️`;
      }
    }
    
    if (queryAnalysis.type === 'weather') {
      routingGuidance = `\n\n🌤️ WETTER-ANFRAGE ERKANNT! 
VERWENDE SOFORT: http_call mit Endpoint: "${queryAnalysis.endpoint}"
Location detected: ${queryAnalysis.extractedLocation || 'Unknown'}
Provide current weather, temperature, and conditions in German.`;
    } else if (queryAnalysis.type === 'business') {
      // Extract potential hotel name from the query
      const lowerMsg = message.toLowerCase();
      let hotelSearchHint = '';
      
      // If hotel context exists and no new hotel is mentioned, use context
      if (hotelContext && !lowerMsg.includes('dolder') && !lowerMsg.includes('vier') && 
          !lowerMsg.includes('marriott') && !lowerMsg.includes('kempinski')) {
        hotelSearchHint = `\n\n🚨 VERWENDE DAS HOTEL AUS DEM KONTEXT: "${hotelContext}" 🚨`;
      } else {
        // Check for specific hotel mentions
        const hotelKeywords = ['vier jahreszeiten', 'marriott', 'dolder', 'grand hotel', 'kempinski', 
                               'frankfurt', 'hamburg', 'berlin', 'münchen', 'zürich'];
        const foundHotel = hotelKeywords.find(keyword => lowerMsg.includes(keyword));
        
        if (foundHotel) {
          hotelSearchHint = `\n\n🚨🚨🚨 KRITISCH - SPEZIFISCHES HOTEL ERKANNT: "${foundHotel}" 🚨🚨🚨
          
DU MUSST NACH "${foundHotel}" SUCHEN, NICHT NACH "DOLDER GRAND"!

KORREKTES SQL BEISPIEL:
SELECT * FROM pricing_calculations 
WHERE LOWER(hotel_name) LIKE '%${foundHotel}%'

FALSCHES SQL (NIEMALS VERWENDEN WENN NACH "${foundHotel}" GEFRAGT):
SELECT * FROM pricing_calculations WHERE LOWER(hotel_name) LIKE '%dolder grand%'

⚠️ WARNUNG: Wenn du das falsche Hotel zurückgibst, ist das ein KRITISCHER FEHLER!`;
        }
      }
      
      routingGuidance = `\n\n🏨 BUSINESS-ANFRAGE ERKANNT!
NUTZE: sql_query für Hotel- und Preisdaten
Verfügbare Daten: 10 Hotels, 8 Kalkulationen mit Profitabilitätsanalyse${hotelSearchHint}`;
    } else if (queryAnalysis.type === 'calculation') {
      routingGuidance = `\n\n🧮 BERECHNUNG ERKANNT!
NUTZE: calc_eval für mathematische Operationen`;
    } else if (queryAnalysis.type === 'email') {
      routingGuidance = `\n\n✉️ E-MAIL ANFRAGE ERKANNT!
      
${hotelContext ? `
🔴🔴🔴 ABSOLUT KRITISCH FÜR E-MAIL GENERATION 🔴🔴🔴

DU MUSST DIE E-MAIL ÜBER "${hotelContext}" SCHREIBEN!

FALSCH: E-Mail über The Dolder Grand wenn "${hotelContext}" in der Unterhaltung ist
RICHTIG: E-Mail IMMER über "${hotelContext}"

Die E-Mail MUSS enthalten:
1. Den Namen "${hotelContext}" explizit erwähnen
2. Die korrekten Daten von "${hotelContext}" verwenden
3. KEINE Daten von anderen Hotels mischen

Wenn der Nutzer sagt "generiere eine E-Mail an Alex mit den Daten",
dann MUSS die E-Mail über "${hotelContext}" sein!
` : ''}

NUTZE: Deine Intelligenz direkt - keine Tools nötig
Erstelle professionelle, gut strukturierte E-Mails
ABER VERWENDE NUR DIE DATEN DES AKTUELLEN HOTELS AUS DEM KONTEXT!`;
    }
    
    return { 
      role: 'system', 
      content: basePrompt + contextGuidance + routingGuidance 
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

  // Support GPT-5 and GPT-5 mini as primary models
  private getSupportedModel(requestedModel: string): string {
    const modelMapping = {
      'gpt-5': 'gpt-5', // Use GPT-5 directly
      'gpt-5-preview': 'gpt-5-preview',
      'gpt-5-mini': 'gpt-5-mini', // Use GPT-5 mini
      'gpt-4o-mini': 'gpt-5-mini', // Map old mini to GPT-5 mini
      'gpt-4o': 'gpt-5', // Map GPT-4o to GPT-5
      'gpt-4': 'gpt-5', // Map GPT-4 to GPT-5
      'gpt-4-turbo': 'gpt-5',
    };
    
    return modelMapping[requestedModel as keyof typeof modelMapping] || 'gpt-5';
  }

  // Calculate usage cost with GPT-5 and GPT-5 mini support
  private calculateCost(usage: TokenUsage, model: string): number {
    const rates = {
      'gpt-5': { input: 0.005, output: 0.015 }, // GPT-5 pricing
      'gpt-5-preview': { input: 0.005, output: 0.015 },
      'gpt-5-mini': { input: 0.0002, output: 0.0008 }, // GPT-5 mini pricing
      'gpt-4o': { input: 0.0025, output: 0.01 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4': { input: 0.03, output: 0.06 },
    };
    
    const rate = rates[model as keyof typeof rates] || rates['gpt-5-mini'];
    return (usage.prompt_tokens * rate.input + usage.completion_tokens * rate.output) / 1000;
  }

  // 🌤️ ROBUST WEATHER DETECTION
  private isWeatherQuestion(message: string): boolean {
    const msg = message.toLowerCase().trim();
    console.log('🔍 WEATHER DETECTION - Checking message:', `"${msg}"`);
    
    // Core weather words
    const weatherWords = ['wetter', 'weather', 'temperatur', 'temperature'];
    
    // City names
    const cities = ['düsseldorf', 'berlin', 'münchen', 'hamburg', 'köln', 'frankfurt'];
    
    // Weather patterns
    const weatherPatterns = [
      /wie ist.*wetter/,
      /wetter.*in/,
      /temperatur.*in/,
      /wetter.*düsseldorf|berlin|münchen|hamburg|köln/
    ];
    
    // Check for weather words
    const hasWeatherWord = weatherWords.some(word => {
      const found = msg.includes(word);
      if (found) console.log(`🌤️ Found weather word: "${word}"`);
      return found;
    });
    
    // Check for cities (weather context)
    const hasCity = cities.some(city => {
      const found = msg.includes(city);
      if (found) console.log(`🏙️ Found city: "${city}"`);
      return found;
    });
    
    // Check patterns
    const hasPattern = weatherPatterns.some(pattern => {
      const found = pattern.test(msg);
      if (found) console.log(`🔍 Matched pattern: ${pattern}`);
      return found;
    });
    
    const isWeather = hasWeatherWord || (hasCity && /wie ist|was ist|wie wird/.test(msg)) || hasPattern;
    console.log('🌤️ WEATHER RESULT:', isWeather);
    return isWeather;
  }

  // 🏨 DYNAMIC HOTEL DETECTION - Now uses database + spelling correction
  private async isHotelQuestion(message: string): Promise<boolean> {
    await IntelligentDetector.refreshHotelData();
    const analysis = await IntelligentDetector.detectHotelBusiness(message);
    const isHotel = analysis?.type === 'hotel_business' || false;
    console.log('🏨 DYNAMIC HOTEL DETECTION:', isHotel, 'for message:', message.substring(0, 50));
    
    // Additional debug information
    if (analysis) {
      console.log('🏨 DETECTION DETAILS:', {
        type: analysis.type,
        confidence: analysis.confidence,
        extractedHotel: analysis.extractedHotel,
        suggestedTools: analysis.suggestedTools
      });
    }
    
    return isHotel;
  }

  // 🚀 SIMPLE SYSTEM MESSAGE
  private getSimpleSystemMessage(isWeatherQuery: boolean, isHotelQuery: boolean, message: string): { role: 'system'; content: string } {
    if (isWeatherQuery) {
      return {
        role: 'system',
        content: `You are ChatGPT. Answer this weather question with detailed, helpful information using your knowledge.

Current question: "${message}"

Provide specific weather information for the city mentioned, including climate patterns, typical temperatures, and seasonal information. Be detailed and informative.`
      };
    }

    if (isHotelQuery) {
      return {
        role: 'system', 
        content: `You are a hotel business analyst with access to SQL database tools. You MUST use the sql_query tool for this hotel question.

CRITICAL INSTRUCTIONS:
1. ALWAYS use sql_query tool first for hotel questions
2. Do NOT provide weather information 
3. Focus ONLY on hotel business data
4. Ignore any previous weather context

Current hotel question: "${message}"

Available tools: sql_query, calc_eval
MANDATORY: Use sql_query tool to get hotel data from pricing_calculations table.

Example: SELECT * FROM pricing_calculations WHERE hotel_name ILIKE '%dolder%' LIMIT 5`
      };
    }

    return {
      role: 'system',
      content: `You are ChatGPT. Answer this question with your comprehensive world knowledge: "${message}"

For questions about hotel statistics in countries, provide detailed industry information using your training data knowledge.

Example for "How many hotels are there in Germany?":
- Provide specific statistics from your knowledge about Germany's hotel industry
- Include different types of accommodations (hotels, pensions, B&Bs)
- Mention regional distribution, star categories, market trends
- Be comprehensive and informative like ChatGPT would be

NEVER mention databases, SQL queries, or tools. Answer directly with your knowledge.`
      };
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

    // Delete related records in correct order to avoid foreign key constraints
    for (const threadId of threadIds) {
      // Delete logs first (they reference threads)
      await db
        .delete(aiLogs)
        .where(eq(aiLogs.threadId, threadId));
      
      // Delete messages
      await db
        .delete(aiMessages)
        .where(eq(aiMessages.threadId, threadId));
    }

    // Finally delete the threads
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
    
    // Delete all related records for user's threads
    for (const thread of userThreads) {
      // Delete logs first (they reference threads)
      await db
        .delete(aiLogs)
        .where(eq(aiLogs.threadId, thread.id));
      
      // Delete messages
      await db
        .delete(aiMessages)
        .where(eq(aiMessages.threadId, thread.id));
    }

    // Finally delete all threads and return count
    const result = await db
      .delete(aiThreads)
      .where(eq(aiThreads.userId, userId))
      .returning();

    return result.length;
  }
}