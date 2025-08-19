import { db } from '../../db';
import { aiLogs } from '../../../shared/schema';

export interface FeedbackSubmitInput {
  threadId: number;
  messageId?: number;
  rating: 'up' | 'down';
  comment?: string;
  userId?: number;
}

export interface FeedbackSubmitResult {
  ok: boolean;
  feedbackId?: number;
  error?: string;
}

export async function feedback_submit(input: FeedbackSubmitInput): Promise<FeedbackSubmitResult> {
  try {
    const { threadId, messageId, rating, comment, userId } = input;
    
    // Store feedback in database (using aiLogs table for now)
    const feedback = await db.insert(aiLogs).values({
      userId: userId || 0,
      threadId,
      model: 'feedback',
      tokenInput: 0,
      tokenOutput: 0,
      cost: 0,
      latency: 0,
      toolCalls: JSON.stringify([{
        type: 'feedback',
        messageId,
        rating,
        comment
      }]),
      createdAt: new Date(),
    }).returning();
    
    // Trigger learning job if this is negative feedback
    if (rating === 'down' && comment) {
      // In production, this would trigger a BullMQ job
      console.log('Negative feedback received, should trigger learning job:', {
        threadId,
        messageId,
        comment
      });
    }
    
    return {
      ok: true,
      feedbackId: feedback[0]?.id
    };
    
  } catch (error: any) {
    return {
      ok: false,
      error: error.message || 'Failed to submit feedback'
    };
  }
}