import { db } from '../../db';
import { aiDocs, aiChunks, aiEmbeddings } from '../../../shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface DocsSearchInput {
  query: string;
  topK?: number;
  userId?: number;
}

export interface DocsSearchResult {
  hits: Array<{
    docId: number;
    chunkId: number;
    score: number;
    preview: string;
    filename?: string;
    sourceUrl?: string;
  }>;
  error?: string;
}

export async function docs_search(input: DocsSearchInput): Promise<DocsSearchResult> {
  try {
    const { query, topK = 5, userId } = input;
    
    if (!process.env.OPENAI_API_KEY) {
      return {
        hits: [],
        error: 'OpenAI API key not configured for embeddings'
      };
    }
    
    // Generate query embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: query,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Search for similar chunks using cosine similarity
    // This is a simplified version - in production you'd use pgvector
    const chunks = await db
      .select({
        chunkId: aiChunks.id,
        docId: aiChunks.docId,
        content: aiChunks.content,
        filename: aiDocs.originalName,
      })
      .from(aiChunks)
      .innerJoin(aiDocs, eq(aiChunks.docId, aiDocs.id))
      .where(userId ? eq(aiDocs.userId, userId) : undefined)
      .orderBy(desc(aiChunks.id))
      .limit(50); // Get more chunks to filter through
    
    // Simple text matching as fallback (replace with proper vector search in production)
    const results = chunks
      .filter(chunk => 
        chunk.content.toLowerCase().includes(query.toLowerCase()) ||
        query.toLowerCase().split(' ').some(term => 
          chunk.content.toLowerCase().includes(term)
        )
      )
      .slice(0, topK)
      .map(chunk => ({
        docId: chunk.docId,
        chunkId: chunk.chunkId,
        score: 0.8, // Placeholder score
        preview: chunk.content.substring(0, 200) + '...',
        filename: chunk.filename || undefined,
      }));
    
    return { hits: results };
    
  } catch (error: any) {
    return {
      hits: [],
      error: error.message || 'Search failed'
    };
  }
}

export async function docs_get(input: { docId: number; chunkId?: number }): Promise<{ content: string; sourceUrl?: string; error?: string }> {
  try {
    const { docId, chunkId } = input;
    
    if (chunkId) {
      // Get specific chunk
      const chunk = await db.query.aiChunks.findFirst({
        where: and(eq(aiChunks.id, chunkId), eq(aiChunks.docId, docId))
      });
      
      if (!chunk) {
        return { content: '', error: 'Chunk not found' };
      }
      
      return { content: chunk.content };
    } else {
      // Get all chunks for document
      const chunks = await db.query.aiChunks.findMany({
        where: eq(aiChunks.docId, docId),
        orderBy: [aiChunks.chunkIndex]
      });
      
      if (!chunks.length) {
        return { content: '', error: 'Document not found' };
      }
      
      const content = chunks.map(chunk => chunk.content).join('\n\n');
      return { content };
    }
    
  } catch (error: any) {
    return {
      content: '',
      error: error.message || 'Failed to retrieve document'
    };
  }
}