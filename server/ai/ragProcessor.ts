import fs from 'fs/promises';
import path from 'path';
import PDFParse from 'pdf-parse';
import mammoth from 'mammoth';
import { parse as csvParse } from 'csv-parse';
import * as XLSX from 'xlsx';
import OpenAI from 'openai';
import { db } from '../db';
import { aiDocs, aiChunks, aiEmbeddings, InsertAiDoc, InsertAiChunk, InsertAiEmbedding } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface DocumentChunk {
  content: string;
  tokenCount: number;
  metadata?: {
    page?: number;
    section?: string;
    worksheet?: string;
    rowRange?: string;
  };
}

export class RAGProcessor {
  private uploadDir = './uploads/ai-docs';

  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
  }

  // Count tokens (approximation: 1 token ≈ 4 characters)
  private countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Extract text from different file types
  async extractText(filePath: string, fileType: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath);

      switch (fileType.toLowerCase()) {
        case 'pdf':
          // TODO: Fix PDF parsing - currently disabled due to test file issue
          throw new Error('PDF processing temporarily disabled');

        case 'docx':
        case 'doc':
          const docResult = await mammoth.extractRawText({ buffer });
          return docResult.value;

        case 'txt':
        case 'md':
        case 'markdown':
          return buffer.toString('utf-8');

        case 'csv':
          return new Promise((resolve, reject) => {
            const csvContent = buffer.toString('utf-8');
            const rows: string[] = [];
            
            csvParse(csvContent, {
              skip_empty_lines: true,
            }, (err, records) => {
              if (err) {
                reject(err);
                return;
              }
              
              // Convert CSV to readable text
              records.forEach((row, index) => {
                if (index === 0) {
                  rows.push(`Headers: ${row.join(' | ')}`);
                } else {
                  rows.push(`Row ${index}: ${row.join(' | ')}`);
                }
              });
              
              resolve(rows.join('\n'));
            });
          });

        case 'xlsx':
        case 'xls':
          const workbook = XLSX.read(buffer);
          const sheets: string[] = [];
          
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            sheets.push(`\n=== Worksheet: ${sheetName} ===`);
            jsonData.forEach((row: any, index) => {
              if (Array.isArray(row) && row.length > 0) {
                sheets.push(`Row ${index + 1}: ${row.join(' | ')}`);
              }
            });
          });
          
          return sheets.join('\n');

        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      console.error(`Error extracting text from ${fileType}:`, error);
      throw error;
    }
  }

  // Chunk text with overlap
  chunkText(text: string, chunkSize = 1000, overlap = 150): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const words = text.split(/\s+/);
    const wordsPerChunk = Math.ceil(chunkSize / 4); // Approximate words per chunk
    const overlapWords = Math.ceil(overlap / 4);

    for (let i = 0; i < words.length; i += wordsPerChunk - overlapWords) {
      const chunkWords = words.slice(i, i + wordsPerChunk);
      const chunkText = chunkWords.join(' ');
      
      if (chunkText.trim()) {
        chunks.push({
          content: chunkText,
          tokenCount: this.countTokens(chunkText),
          metadata: {
            section: `Chunk ${chunks.length + 1}`,
          },
        });
      }
    }

    return chunks;
  }

  // Generate embeddings for a chunk
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  // Process and store document
  async processDocument(
    userId: number,
    filePath: string,
    originalName: string,
    fileType: string
  ): Promise<{ docId: number; chunks: number }> {
    try {
      console.log(`Processing document: ${originalName}`);
      
      // Extract text from the file
      const extractedText = await this.extractText(filePath, fileType);
      
      if (!extractedText.trim()) {
        throw new Error('No text could be extracted from the file');
      }

      // Get file stats
      const stats = await fs.stat(filePath);
      
      // Create document record
      const docData: InsertAiDoc = {
        userId,
        filename: path.basename(filePath),
        originalName,
        fileType,
        filePath: path.relative('./uploads', filePath),
        fileSize: stats.size,
      };

      const [doc] = await db.insert(aiDocs).values(docData).returning();
      console.log(`Created document record: ${doc.id}`);

      // Chunk the text
      const chunks = this.chunkText(extractedText);
      console.log(`Generated ${chunks.length} chunks`);

      // Process chunks in batches to avoid rate limits
      const batchSize = 5;
      let processedChunks = 0;

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (chunk, batchIndex) => {
          const chunkIndex = i + batchIndex;
          
          try {
            // Generate embedding
            const embedding = await this.generateEmbedding(chunk.content);
            
            // Store chunk
            const chunkData: InsertAiChunk = {
              docId: doc.id,
              chunkIndex,
              content: chunk.content,
              tokenCount: chunk.tokenCount,
              metadata: chunk.metadata,
            };

            const [storedChunk] = await db.insert(aiChunks).values(chunkData).returning();

            // Store embedding
            const embeddingData: InsertAiEmbedding = {
              chunkId: storedChunk.id,
              embedding: JSON.stringify(embedding),
            };

            await db.insert(aiEmbeddings).values(embeddingData);
            processedChunks++;
            
            console.log(`Processed chunk ${chunkIndex + 1}/${chunks.length}`);
          } catch (error) {
            console.error(`Error processing chunk ${chunkIndex}:`, error);
            // Continue with other chunks even if one fails
          }
        }));
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`Successfully processed ${originalName}: ${processedChunks} chunks`);
      
      return {
        docId: doc.id,
        chunks: processedChunks,
      };

    } catch (error) {
      console.error(`Error processing document ${originalName}:`, error);
      throw error;
    }
  }

  // Re-index a document (useful for admin operations)
  async reindexDocument(docId: number, userId: number): Promise<void> {
    try {
      // Get document info
      const doc = await db.query.aiDocs.findFirst({
        where: (docs, { eq, and }) => and(eq(docs.id, docId), eq(docs.userId, userId)),
      });

      if (!doc) {
        throw new Error('Document not found or access denied');
      }

      // Delete existing chunks and embeddings (cascade will handle embeddings)
      await db.delete(aiChunks).where(eq(aiChunks.docId, docId));

      // Re-process the document
      const fullPath = path.join('./uploads', doc.filePath);
      await this.processDocument(userId, fullPath, doc.originalName, doc.fileType);
      
      console.log(`Re-indexed document: ${doc.originalName}`);
    } catch (error) {
      console.error('Error re-indexing document:', error);
      throw error;
    }
  }
}