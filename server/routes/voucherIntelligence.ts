import { Router } from 'express';
import { z } from 'zod';
import { voucherIntelligence } from '../voucherIntelligence';
import { requireAuth } from '../localAuth';

const router = Router();

// Schema for voucher prediction request
const predictVoucherSchema = z.object({
  hotelName: z.string().min(1),
  stars: z.number().min(1).max(5),
  roomCount: z.number().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  averageMarketPrice: z.number().optional(),
  seasonality: z.enum(['high', 'mid', 'low']).optional(),
  competitorVoucherValues: z.array(z.number()).optional(),
  localEvents: z.array(z.string()).optional(),
});

// Schema for learning feedback
const learnFeedbackSchema = z.object({
  calculationId: z.number().optional(),
  hotelName: z.string().min(1),
  stars: z.number().min(1).max(5),
  roomCount: z.number().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  averageMarketPrice: z.number().optional(),
  seasonality: z.enum(['high', 'mid', 'low']).optional(),
  competitorVoucherValues: z.array(z.number()).optional(),
  localEvents: z.array(z.string()).optional(),
  aiSuggestion: z.number(),
  userChoice: z.number(),
  userFeedback: z.string().min(1),
});

/**
 * POST /api/voucher-intelligence/predict
 * Get AI-powered voucher value prediction
 */
router.post('/predict', requireAuth, async (req, res) => {
  try {
    const data = predictVoucherSchema.parse(req.body);
    
    console.log(`🧠 Predicting voucher value for: ${data.hotelName} (${data.stars}⭐)`);
    
    const characteristics = {
      name: data.hotelName,
      stars: data.stars,
      roomCount: data.roomCount,
      location: data.location,
      category: data.category,
      amenities: data.amenities,
      averageMarketPrice: data.averageMarketPrice,
    };

    const context = {
      seasonality: data.seasonality,
      competitorVoucherValues: data.competitorVoucherValues,
      localEvents: data.localEvents,
    };

    const prediction = await voucherIntelligence.predictVoucherValue(characteristics, context);
    
    console.log(`💡 Voucher prediction: €${prediction.suggestedValue} (${prediction.confidence}% confidence)`);
    
    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    console.error('Error predicting voucher value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to predict voucher value',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/voucher-intelligence/learn
 * Learn from user feedback and manual edits
 */
router.post('/learn', requireAuth, async (req, res) => {
  try {
    const data = learnFeedbackSchema.parse(req.body);
    const userId = req.user.id;
    
    console.log(`📚 Learning from feedback: ${data.hotelName} - AI: €${data.aiSuggestion}, User: €${data.userChoice}`);
    
    const characteristics = {
      name: data.hotelName,
      stars: data.stars,
      roomCount: data.roomCount,
      location: data.location,
      category: data.category,
      amenities: data.amenities,
      averageMarketPrice: data.averageMarketPrice,
    };

    const context = {
      seasonality: data.seasonality,
      competitorVoucherValues: data.competitorVoucherValues,
      localEvents: data.localEvents,
    };

    await voucherIntelligence.learnFromUserFeedback(
      userId,
      data.calculationId || null,
      characteristics,
      context,
      data.aiSuggestion,
      data.userChoice,
      data.userFeedback
    );
    
    console.log(`✅ Successfully learned from user feedback for ${data.hotelName}`);
    
    res.json({
      success: true,
      message: 'Learning data saved successfully',
    });
  } catch (error) {
    console.error('Error learning from feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save learning data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/voucher-intelligence/stats
 * Get intelligence system statistics
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    console.log('📊 Getting voucher intelligence statistics');
    
    const stats = await voucherIntelligence.getIntelligenceStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting intelligence stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get intelligence statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/voucher-intelligence/bulk-predict
 * Bulk prediction for multiple hotels (for batch processing)
 */
router.post('/bulk-predict', requireAuth, async (req, res) => {
  try {
    const hotels = z.array(predictVoucherSchema).parse(req.body);
    
    console.log(`🔄 Bulk predicting voucher values for ${hotels.length} hotels`);
    
    const predictions = [];
    
    for (const hotelData of hotels) {
      try {
        const characteristics = {
          name: hotelData.hotelName,
          stars: hotelData.stars,
          roomCount: hotelData.roomCount,
          location: hotelData.location,
          category: hotelData.category,
          amenities: hotelData.amenities,
          averageMarketPrice: hotelData.averageMarketPrice,
        };

        const context = {
          seasonality: hotelData.seasonality,
          competitorVoucherValues: hotelData.competitorVoucherValues,
          localEvents: hotelData.localEvents,
        };

        const prediction = await voucherIntelligence.predictVoucherValue(characteristics, context);
        
        predictions.push({
          hotelName: hotelData.hotelName,
          prediction,
        });
      } catch (error) {
        console.error(`Error predicting for ${hotelData.hotelName}:`, error);
        predictions.push({
          hotelName: hotelData.hotelName,
          error: error instanceof Error ? error.message : 'Prediction failed',
        });
      }
    }
    
    console.log(`✅ Completed bulk prediction for ${predictions.length} hotels`);
    
    res.json({
      success: true,
      data: predictions,
    });
  } catch (error) {
    console.error('Error in bulk prediction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk predictions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;