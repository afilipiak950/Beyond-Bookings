import { db } from '../../db';
import { aiDocs, aiChunks } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const docsGetSchema = z.object({
  docId: z.string(),
  chunkId: z.string().optional(),
});

export type DocsGetParams = z.infer<typeof docsGetSchema>;

export interface DocsGetResult {
  content: string;
  sourceUrl?: string;
  filename?: string;
  metadata?: any;
  error?: string;
}

export async function docsGet(params: DocsGetParams, userId: number): Promise<DocsGetResult> {
  try {
    const { docId, chunkId } = params;
    
    if (chunkId) {
      // Get specific chunk
      const chunk = await db
        .select({
          content: aiChunks.content,
          metadata: aiChunks.metadata,
          filename: aiDocs.filename,
          originalName: aiDocs.originalName,
          filePath: aiDocs.filePath,
        })
        .from(aiChunks)
        .innerJoin(aiDocs, eq(aiChunks.docId, aiDocs.id))
        .where(
          and(
            eq(aiChunks.id, parseInt(chunkId)),
            eq(aiDocs.id, parseInt(docId)),
            eq(aiDocs.userId, userId)
          )
        )
        .limit(1);
      
      if (chunk.length === 0) {
        return {
          content: '',
          error: 'Chunk not found or access denied'
        };
      }
      
      const result = chunk[0];
      return {
        content: result.content,
        filename: result.originalName || result.filename,
        metadata: result.metadata,
        sourceUrl: result.filePath ? `/uploads/${result.filePath}` : undefined,
      };
      
    } else {
      // Get entire document content (all chunks)
      const chunks = await db
        .select({
          content: aiChunks.content,
          chunkIndex: aiChunks.chunkIndex,
          metadata: aiChunks.metadata,
          filename: aiDocs.filename,
          originalName: aiDocs.originalName,
          filePath: aiDocs.filePath,
        })
        .from(aiChunks)
        .innerJoin(aiDocs, eq(aiChunks.docId, aiDocs.id))
        .where(
          and(
            eq(aiDocs.id, parseInt(docId)),
            eq(aiDocs.userId, userId)
          )
        )
        .orderBy(aiChunks.chunkIndex);
      
      if (chunks.length === 0) {
        return {
          content: '',
          error: 'Document not found or access denied'
        };
      }
      
      // Combine all chunks
      const fullContent = chunks
        .map(chunk => chunk.content)
        .join('\n\n');
      
      const firstChunk = chunks[0];
      return {
        content: fullContent,
        filename: firstChunk.originalName || firstChunk.filename,
        metadata: {
          totalChunks: chunks.length,
          chunks: chunks.map(c => c.metadata).filter(Boolean)
        },
        sourceUrl: firstChunk.filePath ? `/uploads/${firstChunk.filePath}` : undefined,
      };
    }
    
  } catch (error) {
    console.error('Document get error:', error);
    return {
      content: '',
      error: error.message || 'Unknown document retrieval error'
    };
  }
}

export const docsGetToolDefinition = {
  type: 'function',
  function: {
    name: 'docs_get',
    description: 'Retrieve full content of a document or specific chunk by ID.',
    parameters: {
      type: 'object',
      properties: {
        docId: {
          type: 'string',
          description: 'ID of the document to retrieve'
        },
        chunkId: {
          type: 'string',
          description: 'Optional: ID of specific chunk to retrieve. If not provided, returns full document.',
          nullable: true
        }
      },
      required: ['docId']
    }
  }
};