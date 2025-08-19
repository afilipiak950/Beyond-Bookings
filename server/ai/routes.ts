import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { db } from '../db';
import { aiDocs, aiThreads, aiLogs } from '../../shared/schema';
import { eq, desc, sum, count, and, gte } from 'drizzle-orm';
import { AIService } from './aiService';
import { RAGProcessor } from './ragProcessor';
import { requireAuth } from '../localAuth';
import { z } from 'zod';
import adminRoutes from './routes/admin';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Mount admin routes
router.use('/admin', adminRoutes);

const aiService = new AIService();
const ragProcessor = new RAGProcessor();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = './uploads/ai-docs';
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.md', '.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported. Allowed: ${allowedTypes.join(', ')}`));
    }
  }
});

// Schema for chat request
const chatRequestSchema = z.object({
  message: z.string().min(1),
  threadId: z.union([z.number(), z.null()]).optional().transform(val => val === null ? undefined : val),
  mode: z.enum(['general', 'calculation', 'docs', 'sql', 'sheets', 'api']).default('general'),
  model: z.enum(['gpt-4o', 'gpt-4o-mini']).default('gpt-4o-mini'),
  title: z.string().optional(),
});

// POST /api/ai/chat - Stream AI chat responses
router.post('/chat', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Raw request body:', req.body);
    const { message, threadId, mode, model, title } = chatRequestSchema.parse(req.body);
    console.log('Parsed request:', { message: message.substring(0, 50), threadId, mode, model });

    // Get or create thread
    const activeThreadId = await aiService.getOrCreateThread(
      req.user.id,
      threadId,
      title,
      mode
    );

    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Start streaming chat
    const chatStream = aiService.streamChat(
      req.user.id,
      activeThreadId,
      message,
      mode,
      model
    );

    for await (const chunk of chatStream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error: any) {
    console.error('Chat API error:', error);
    
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    } else {
      res.status(400).json({ error: error.message || 'Invalid request' });
    }
  }
});

// GET /api/ai/threads - Get user's chat threads
router.get('/threads', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const threads = await aiService.getUserThreads(req.user.id);
    res.json({ threads });

  } catch (error: any) {
    console.error('Get threads error:', error);
    res.status(500).json({ error: error.message || 'Failed to get threads' });
  }
});

// GET /api/ai/threads/:id/messages - Get thread messages
router.get('/threads/:id/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const threadId = parseInt(req.params.id);
    if (isNaN(threadId)) {
      return res.status(400).json({ error: 'Invalid thread ID' });
    }

    const messages = await aiService.getThreadMessages(threadId, req.user.id);
    res.json({ messages });

  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: error.message || 'Failed to get messages' });
  }
});

// PUT /api/ai/threads/:id - Update thread (rename, pin, etc.)
router.put('/threads/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const threadId = parseInt(req.params.id);
    if (isNaN(threadId)) {
      return res.status(400).json({ error: 'Invalid thread ID' });
    }

    const updates = req.body;
    await aiService.updateThread(threadId, req.user.id, updates);
    
    res.json({ success: true });

  } catch (error: any) {
    console.error('Update thread error:', error);
    res.status(500).json({ error: error.message || 'Failed to update thread' });
  }
});

// DELETE /api/ai/threads/:id - Delete thread
router.delete('/threads/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const threadId = parseInt(req.params.id);
    if (isNaN(threadId)) {
      return res.status(400).json({ error: 'Invalid thread ID' });
    }

    await aiService.deleteThread(threadId, req.user.id);
    res.json({ success: true });

  } catch (error: any) {
    console.error('Delete thread error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete thread' });
  }
});

// POST /api/ai/ingest - Upload and process documents
router.post('/ingest', upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, filename, path: filePath, size } = req.file;
    const fileType = path.extname(originalname).toLowerCase().substring(1);

    // Process the document
    const result = await ragProcessor.processDocument(
      req.user.id,
      filePath,
      originalname,
      fileType
    );

    res.json({
      success: true,
      docId: result.docId,
      chunks: result.chunks,
      filename: originalname,
      fileSize: size,
    });

  } catch (error: any) {
    console.error('Document ingest error:', error);
    res.status(500).json({ error: error.message || 'Failed to process document' });
  }
});

// GET /api/ai/docs - Get user's uploaded documents
router.get('/docs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const docs = await db.query.aiDocs.findMany({
      where: (docs, { eq }) => eq(docs.userId, req.user!.id),
      orderBy: [desc(aiDocs.uploadedAt)],
      with: {
        chunks: {
          limit: 1, // Just to get chunk count
        },
      },
    });

    const docsWithStats = await Promise.all(docs.map(async (doc) => {
      const [chunkCount] = await db
        .select({ count: count() })
        .from(aiDocs)
        .where(eq(aiDocs.id, doc.id));

      return {
        id: doc.id,
        filename: doc.originalName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt,
        chunks: chunkCount.count,
      };
    }));

    res.json({ docs: docsWithStats });

  } catch (error: any) {
    console.error('Get docs error:', error);
    res.status(500).json({ error: error.message || 'Failed to get documents' });
  }
});

// DELETE /api/ai/docs/:id - Delete document
router.delete('/docs/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const docId = parseInt(req.params.id);
    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    // Get document info first
    const doc = await db.query.aiDocs.findFirst({
      where: (docs, { eq, and }) => and(eq(docs.id, docId), eq(docs.userId, req.user!.id)),
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from database (cascades to chunks and embeddings)
    await db.delete(aiDocs).where(eq(aiDocs.id, docId));

    // Try to delete the file
    try {
      const fullPath = path.join('./uploads', doc.filePath);
      await fs.unlink(fullPath);
    } catch (fileError) {
      console.warn('Could not delete file:', fileError);
      // Continue even if file deletion fails
    }

    res.json({ success: true });

  } catch (error: any) {
    console.error('Delete doc error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete document' });
  }
});

// POST /api/ai/docs/:id/reindex - Re-index document (admin only)
router.post('/docs/:id/reindex', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const docId = parseInt(req.params.id);
    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    await ragProcessor.reindexDocument(docId, req.user.id);
    res.json({ success: true });

  } catch (error: any) {
    console.error('Re-index error:', error);
    res.status(500).json({ error: error.message || 'Failed to re-index document' });
  }
});

// GET /api/ai/metrics - Get AI usage metrics (admin only)
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get metrics for the last 30 days
    const [totalChats] = await db
      .select({ count: count() })
      .from(aiLogs)
      .where(gte(aiLogs.createdAt, thirtyDaysAgo));

    const [totalCost] = await db
      .select({ total: sum(aiLogs.cost) })
      .from(aiLogs)
      .where(gte(aiLogs.createdAt, thirtyDaysAgo));

    const [avgLatency] = await db
      .select({ avg: sum(aiLogs.latency) })
      .from(aiLogs)
      .where(and(gte(aiLogs.createdAt, thirtyDaysAgo), eq(aiLogs.latency, 0)));

    // Top tools used
    const topTools = await db
      .select({
        tool: aiLogs.toolCalls,
        count: count(),
      })
      .from(aiLogs)
      .where(gte(aiLogs.createdAt, thirtyDaysAgo))
      .groupBy(aiLogs.toolCalls)
      .orderBy(desc(count()))
      .limit(10);

    // Token usage by model
    const tokensByModel = await db
      .select({
        model: aiLogs.model,
        totalTokens: sum(aiLogs.tokenUsage),
        count: count(),
      })
      .from(aiLogs)
      .where(gte(aiLogs.createdAt, thirtyDaysAgo))
      .groupBy(aiLogs.model);

    res.json({
      period: '30 days',
      totalChats: totalChats.count,
      totalCost: parseFloat(String(totalCost.total || 0)),
      averageLatency: avgLatency.avg ? Math.round(Number(avgLatency.avg)) : 0,
      topTools: topTools.map(tool => ({
        name: tool.tool ? JSON.parse(tool.tool as string)?.[0]?.function?.name || 'unknown' : 'none',
        count: tool.count,
      })),
      tokensByModel: tokensByModel.map(model => ({
        model: model.model,
        totalTokens: model.totalTokens,
        chats: model.count,
      })),
    });

  } catch (error: any) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: error.message || 'Failed to get metrics' });
  }
});

export default router;