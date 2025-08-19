import { db } from '../../db';
import { aiDocs, aiChunks, aiEmbeddings } from '../../../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const docsSearchSchema = z.object({
  query: z.string().min(1, "Search query cannot be empty"),
  topK: z.number().min(1).max(20).optional().default(5),
});

export type DocsSearchParams = z.infer<typeof docsSearchSchema>;

export interface DocsSearchHit {
  docId: string;
  chunkId: string;
  score: number;
  preview: string;
  metadata?: any;
  filename?: string;
}

export interface DocsSearchResult {
  hits: DocsSearchHit[];
  totalFound: number;
  error?: string;
}

// Calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function docsSearch(params: DocsSearchParams, userId: number): Promise<DocsSearchResult> {
  try {
    const { query, topK } = params;
    
    // Generate query embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: query,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Get all document chunks with embeddings for this user
    const chunks = await db
      .select({
        chunkId: aiChunks.id,
        docId: aiChunks.docId,
        content: aiChunks.content,
        metadata: aiChunks.metadata,
        embedding: aiEmbeddings.embedding,
        filename: aiDocs.filename,
        originalName: aiDocs.originalName,
      })
      .from(aiChunks)
      .innerJoin(aiEmbeddings, eq(aiChunks.id, aiEmbeddings.chunkId))
      .innerJoin(aiDocs, eq(aiChunks.docId, aiDocs.id))
      .where(eq(aiDocs.userId, userId))
      .orderBy(desc(aiDocs.uploadedAt));
    
    // Calculate similarities
    const similarities: Array<DocsSearchHit & { similarity: number }> = [];
    
    for (const chunk of chunks) {
      try {
        const chunkEmbedding = JSON.parse(chunk.embedding);
        const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
        
        if (similarity > 0.3) { // Minimum similarity threshold
          similarities.push({
            docId: chunk.docId.toString(),
            chunkId: chunk.chunkId.toString(),
            score: Math.round(similarity * 100) / 100,
            similarity,
            preview: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
            metadata: chunk.metadata,
            filename: chunk.originalName || chunk.filename,
          });
        }
      } catch (error) {
        console.error('Error processing chunk embedding:', error);
        continue;
      }
    }
    
    // Sort by similarity and take top K
    const topHits = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(({ similarity, ...hit }) => hit);
    
    return {
      hits: topHits,
      totalFound: similarities.length,
    };
    
  } catch (error) {
    console.error('Document search error:', error);
    return {
      hits: [],
      totalFound: 0,
      error: error.message || 'Unknown document search error'
    };
  }
}

export const docsSearchToolDefinition = {
  type: 'function',
  function: {
    name: 'docs_search',
    description: 'Search uploaded documents using semantic similarity. Returns relevant document chunks.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find relevant documents'
        },
        topK: {
          type: 'integer',
          description: 'Maximum number of results to return',
          default: 5
        }
      },
      required: ['query']
    }
  }
};