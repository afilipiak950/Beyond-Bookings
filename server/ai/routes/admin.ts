import express, { Request, Response } from 'express';
import { db } from '../../db';
import { aiLogs, aiDocs, users } from '../../../shared/schema';
import { eq, desc, sum, count, and, gte, sql } from 'drizzle-orm';
import { requireAuth } from '../../localAuth';

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

// Middleware to check admin role
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: any) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.use(requireAdmin);

// GET /api/ai/admin/metrics - Get AI usage metrics
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get usage statistics
    const [
      totalTokens,
      totalCost,
      averageLatency,
      totalRequests,
      toolDistribution,
      feedbackStats
    ] = await Promise.all([
      // Total tokens used (using existing fields)
      db.select({ 
        total: sql<number>`COALESCE(SUM(CAST(${aiLogs.tokenUsage} AS INTEGER)), 0)`
      }).from(aiLogs).where(gte(aiLogs.createdAt, thirtyDaysAgo)),
      
      // Total cost
      db.select({ 
        total: sql<number>`COALESCE(SUM(${aiLogs.cost}), 0)`
      }).from(aiLogs).where(gte(aiLogs.createdAt, thirtyDaysAgo)),
      
      // Average latency
      db.select({ 
        average: sql<number>`COALESCE(AVG(${aiLogs.latency}), 0)`
      }).from(aiLogs).where(gte(aiLogs.createdAt, thirtyDaysAgo)),
      
      // Total requests
      db.select({ 
        count: count()
      }).from(aiLogs).where(gte(aiLogs.createdAt, thirtyDaysAgo)),
      
      // Tool usage distribution
      db.select({
        model: aiLogs.model,
        count: count()
      }).from(aiLogs)
        .where(gte(aiLogs.createdAt, thirtyDaysAgo))
        .groupBy(aiLogs.model),
      
      // Feedback statistics (using model field to identify feedback entries)
      db.select({
        model: aiLogs.model,
        count: count()
      }).from(aiLogs)
        .where(and(
          gte(aiLogs.createdAt, thirtyDaysAgo),
          eq(aiLogs.model, 'feedback')
        ))
        .groupBy(aiLogs.model)
    ]);

    res.json({
      period: '30 days',
      metrics: {
        totalTokens: totalTokens[0]?.total || 0,
        totalCost: parseFloat(totalCost[0]?.total || '0'),
        averageLatency: parseFloat(averageLatency[0]?.average || '0'),
        totalRequests: totalRequests[0]?.count || 0,
        toolDistribution,
        feedbackCount: feedbackStats[0]?.count || 0
      }
    });
    
  } catch (error) {
    console.error('Admin metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// GET /api/ai/admin/documents - Get document management interface
router.get('/documents', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const docs = await db.select().from(aiDocs).orderBy(desc(aiDocs.uploadedAt));

    res.json({ docs });
    
  } catch (error) {
    console.error('Admin documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// DELETE /api/ai/admin/documents/:id - Delete a document
router.delete('/documents/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const docId = parseInt(req.params.id);
    
    // Delete document and its chunks
    await db.delete(aiDocs).where(eq(aiDocs.id, docId));
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Admin delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// GET /api/ai/admin/logs - Get AI interaction logs
router.get('/logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const logs = await db.select().from(aiLogs)
      .orderBy(desc(aiLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const totalLogs = await db.select({ count: count() }).from(aiLogs);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total: totalLogs[0]?.count || 0,
        totalPages: Math.ceil((totalLogs[0]?.count || 0) / limit)
      }
    });
    
  } catch (error) {
    console.error('Admin logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// POST /api/ai/admin/kb - Create knowledge base entry
router.post('/kb', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, markdown, tags } = req.body;
    
    if (!title || !markdown) {
      return res.status(400).json({ error: 'Title and markdown content required' });
    }

    // Store in aiLogs as a knowledge base entry for now
    const kbEntry = await db.insert(aiLogs).values({
      role: 'system',
      prompt: title,
      response: markdown,
      model: 'knowledge_base',
      tokenUsage: '0',
      cost: '0',
      latency: 0,
      toolCalls: JSON.stringify({ title, markdown, tags }),
      createdAt: new Date(),
    }).returning();

    res.json({ success: true, entry: kbEntry[0] });
    
  } catch (error) {
    console.error('Admin KB create error:', error);
    res.status(500).json({ error: 'Failed to create knowledge base entry' });
  }
});

// GET /api/ai/admin/users - Get user activity for AI features
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get basic user stats (simplified for now)
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    const userStats = allUsers.map(user => ({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      requestCount: 0, // Placeholder
      totalCost: '0', // Placeholder
      lastActivity: user.createdAt
    }));

    res.json({ users: userStats });
    
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

export default router;