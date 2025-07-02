import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, hashPassword, comparePassword } from "./localAuth";
import { insertPricingCalculationSchema, insertFeedbackSchema, insertOcrAnalysisSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

// Login/Register schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || !await comparePassword(password, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = registerSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: "user"
      });

      req.session.userId = user.id;
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      // Extend session on activity
      if (req.session) {
        req.session.touch();
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Session refresh endpoint to keep sessions alive
  app.post('/api/auth/refresh', requireAuth, async (req: any, res) => {
    try {
      if (req.session) {
        req.session.touch();
      }
      res.json({ message: "Session refreshed", timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Session refresh error:", error);
      res.status(500).json({ message: "Failed to refresh session" });
    }
  });

  // Logout endpoint for local authentication
  app.get('/api/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.redirect('/');
    });
  });

  // Export account data endpoint
  app.get('/api/auth/export-data', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Gather all user data
      const pricingCalculations = await storage.getPricingCalculations(userId.toString());
      const ocrAnalyses = await storage.getOcrAnalyses(userId.toString());
      
      const exportData = {
        profile: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          profileImageUrl: user.profileImageUrl,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        pricingCalculations: pricingCalculations.map(calc => ({
          id: calc.id,
          hotelName: calc.hotelName,
          hotelStars: calc.hotelStars,
          totalRooms: calc.totalRooms,
          occupancyRate: calc.occupancyRate,
          averagePrice: calc.averagePrice,
          voucherPrice: calc.voucherPrice,
          operationalCosts: calc.operationalCosts,
          vatRate: calc.vatRate,
          vatAmount: calc.vatAmount,
          profitMargin: calc.profitMargin,
          totalPrice: calc.totalPrice,
          createdAt: calc.createdAt,
          updatedAt: calc.updatedAt
        })),
        ocrAnalyses: ocrAnalyses.map(analysis => ({
          id: analysis.id,
          fileName: analysis.fileName,
          fileSize: analysis.fileSize,
          status: analysis.status,
          extractedText: analysis.extractedText,
          insights: analysis.insights,
          processingTime: analysis.processingTime,
          createdAt: analysis.createdAt,
          updatedAt: analysis.updatedAt
        })),
        exportMetadata: {
          exportedAt: new Date().toISOString(),
          totalCalculations: pricingCalculations.length,
          totalAnalyses: ocrAnalyses.length,
          version: "1.0"
        }
      };

      res.json(exportData);
    } catch (error) {
      console.error("Export data error:", error);
      res.status(500).json({ message: "Failed to export account data" });
    }
  });

  // Delete account endpoint
  app.delete('/api/auth/delete-account', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Delete all user data in the correct order to respect foreign key constraints
      // First delete dependent records
      const pricingCalculations = await storage.getPricingCalculations(userId.toString());
      for (const calc of pricingCalculations) {
        await storage.deletePricingCalculation(calc.id, userId.toString());
      }
      
      const ocrAnalyses = await storage.getOcrAnalyses(userId.toString());
      for (const analysis of ocrAnalyses) {
        await storage.deleteOcrAnalysis(analysis.id, userId.toString());
      }
      
      // Finally delete the user account
      const deleted = await storage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Destroy the session
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Session destruction error:", err);
        }
      });
      
      res.json({ 
        message: "Account successfully deleted",
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Profile update endpoint
  app.put('/api/auth/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, profileImageUrl } = req.body;

      const updatedUser = await storage.updateUser(userId, {
        firstName: firstName || null,
        lastName: lastName || null,
        profileImageUrl: profileImageUrl || null
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Password change endpoint
  app.post('/api/auth/change-password', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUser(userId, { password: hashedNewPassword });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.userId = undefined;
    res.json({ message: "Logged out successfully" });
  });

  // Hotel routes
  app.get('/api/hotels', requireAuth, async (req, res) => {
    try {
      const hotels = await storage.getHotels();
      res.json(hotels);
    } catch (error) {
      console.error("Error fetching hotels:", error);
      res.status(500).json({ message: "Failed to fetch hotels" });
    }
  });

  app.post('/api/hotels/scrape', requireAuth, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      const hotelData = await storage.scrapeHotelData(url);
      res.json(hotelData);
    } catch (error) {
      console.error("Error scraping hotel data:", error);
      res.status(500).json({ message: "Failed to scrape hotel data" });
    }
  });

  // Pricing calculation routes
  app.get('/api/pricing-calculations', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const calculations = await storage.getPricingCalculations(userId);
      res.json(calculations);
    } catch (error) {
      console.error("Error fetching pricing calculations:", error);
      res.status(500).json({ message: "Failed to fetch pricing calculations" });
    }
  });

  app.post('/api/pricing-calculations', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertPricingCalculationSchema.parse({
        ...req.body,
        userId,
      });

      const calculation = await storage.createPricingCalculation(validatedData);
      res.json(calculation);
    } catch (error) {
      console.error("Error creating pricing calculation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create pricing calculation" });
    }
  });

  app.put('/api/pricing-calculations/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const calculationId = parseInt(req.params.id);
      
      const validatedData = insertPricingCalculationSchema.partial().parse(req.body);
      
      const calculation = await storage.updatePricingCalculation(calculationId, userId, validatedData);
      if (!calculation) {
        return res.status(404).json({ message: "Calculation not found" });
      }
      
      res.json(calculation);
    } catch (error) {
      console.error("Error updating pricing calculation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update pricing calculation" });
    }
  });

  app.delete('/api/pricing-calculations/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const calculationId = parseInt(req.params.id);
      
      const success = await storage.deletePricingCalculation(calculationId, userId);
      if (!success) {
        return res.status(404).json({ message: "Calculation not found" });
      }
      
      res.json({ message: "Calculation deleted successfully" });
    } catch (error) {
      console.error("Error deleting pricing calculation:", error);
      res.status(500).json({ message: "Failed to delete pricing calculation" });
    }
  });

  // Feedback routes
  app.post('/api/feedback', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertFeedbackSchema.parse({
        ...req.body,
        userId,
      });

      const feedback = await storage.createFeedback(validatedData);
      res.json(feedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create feedback" });
    }
  });

  // Export routes
  app.post('/api/export/pdf', requireAuth, async (req: any, res) => {
    try {
      const { calculationId } = req.body;
      const userId = req.user.claims.sub;
      
      const pdfBuffer = await storage.exportToPDF(calculationId, userId);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="pricing-calculation.pdf"');
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      res.status(500).json({ message: "Failed to export to PDF" });
    }
  });

  app.post('/api/export/excel', requireAuth, async (req: any, res) => {
    try {
      const { calculationId } = req.body;
      const userId = req.user.claims.sub;
      
      const excelBuffer = await storage.exportToExcel(calculationId, userId);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="pricing-calculation.xlsx"');
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      res.status(500).json({ message: "Failed to export to Excel" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/admin/users', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { email, firstName, lastName, role } = req.body;
      const newUser = await storage.createUserByAdmin({
        id: `admin_created_${Date.now()}`,
        email,
        firstName,
        lastName,
        role: role || 'user',
      });

      res.json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.delete('/api/admin/users/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userId = req.params.id;
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Configure multer for file uploads
  const upload = multer({
    dest: 'uploads/',
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files are allowed'));
      }
    }
  });

  // OCR Analysis routes
  app.get('/api/ocr-analyses', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const analyses = await storage.getOcrAnalyses(userId);
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching OCR analyses:", error);
      res.status(500).json({ message: "Failed to fetch OCR analyses" });
    }
  });

  app.post('/api/ocr/upload', requireAuth, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.id.toString();
      const analysis = await storage.createOcrAnalysis({
        userId,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        status: 'pending'
      });

      res.json(analysis);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.post('/api/ocr/analyze/:id', requireAuth, async (req: any, res) => {
    try {
      const analysisId = parseInt(req.params.id);
      const userId = req.user.id.toString();
      
      // Get the analysis
      const analysis = await storage.getOcrAnalysis(analysisId, userId);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      // Mock OCR processing with Mistral API integration
      // In production, this would make actual API calls to Mistral
      const mockInsights = {
        summary: "This Excel file contains hotel pricing data with revenue trends showing seasonal patterns. Key performance indicators suggest strong Q4 performance with room occupancy rates averaging 78%.",
        keyMetrics: [
          { metric: "Total Revenue", value: "€125,450", change: "+12.3%" },
          { metric: "Avg Room Rate", value: "€89.50", change: "+5.7%" },
          { metric: "Occupancy Rate", value: "78%", change: "+2.1%" },
          { metric: "RevPAR", value: "€69.81", change: "+8.2%" }
        ],
        recommendations: [
          "Increase pricing during peak season months (July-August) by 15-20%",
          "Implement dynamic pricing strategy for weekends",
          "Focus marketing efforts on corporate bookings for weekdays",
          "Consider package deals for longer stays to improve occupancy"
        ],
        trends: [
          {
            category: "Revenue Growth",
            trend: "up" as const,
            description: "Consistent upward trend in monthly revenue over the past quarter"
          },
          {
            category: "Seasonal Demand",
            trend: "stable" as const,
            description: "Predictable seasonal patterns with summer peaks"
          },
          {
            category: "Market Competition",
            trend: "down" as const,
            description: "Competitive pricing pressure in the local market"
          }
        ]
      };

      const extractedText = "Hotel Revenue Data\nMonth\tRevenue\tOccupancy\nJan\t€10,500\t65%\nFeb\t€12,200\t70%\nMar\t€15,800\t78%\n...";

      // Update the analysis with results
      const updatedAnalysis = await storage.updateOcrAnalysis(analysisId, userId, {
        status: 'completed',
        extractedText,
        insights: mockInsights,
        processingTime: 4.2
      });

      res.json(updatedAnalysis);
    } catch (error) {
      console.error("Error analyzing file:", error);
      res.status(500).json({ message: "Failed to analyze file" });
    }
  });

  app.delete('/api/ocr/analysis/:id', requireAuth, async (req: any, res) => {
    try {
      const analysisId = parseInt(req.params.id);
      const userId = req.user.id.toString();
      
      const success = await storage.deleteOcrAnalysis(analysisId, userId);
      if (!success) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting analysis:", error);
      res.status(500).json({ message: "Failed to delete analysis" });
    }
  });

  // Export OCR analysis report
  app.post('/api/ocr/export', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const { analysisIds } = req.body;
      
      // Get analyses to export
      const analyses = analysisIds 
        ? await Promise.all(analysisIds.map((id: string) => storage.getOcrAnalysis(parseInt(id), userId)))
        : await storage.getOcrAnalyses(userId);

      // Generate PDF content (mock implementation)
      const reportContent = `
OCR Analysis Report
Generated: ${new Date().toLocaleDateString()}
Total Files: ${analyses.length}

Files Analyzed:
${analyses.map(analysis => `
- ${analysis?.fileName}
  Status: ${analysis?.insights ? 'Completed' : 'Pending'}
  Processing Time: ${analysis?.processingTime || 0}s
  Summary: ${analysis?.insights?.summary || 'No insights available'}
`).join('\n')}

Key Metrics Summary:
${analyses.filter(a => a?.insights).map(analysis => 
  analysis?.insights?.keyMetrics.map(metric => 
    `${metric.metric}: ${metric.value} ${metric.change || ''}`
  ).join('\n')
).join('\n')}
      `;

      // Create PDF buffer (in production, use a proper PDF library)
      const buffer = Buffer.from(reportContent, 'utf-8');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=ocr-analysis-report.pdf');
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting report:", error);
      res.status(500).json({ message: "Failed to export report" });
    }
  });

  // AI Assistant Chat endpoint with deep functionality
  app.post("/api/ai/chat", requireAuth, async (req: Request, res: Response) => {
    try {
      const { message, context } = req.body;
      const userId = (req as any).user?.id;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get user's actual data for personalized responses
      const userCalculations = await storage.getPricingCalculations(userId.toString());
      const userHotels = await storage.getHotels();
      const userAnalyses = await storage.getOcrAnalyses(userId.toString());

      let response = "";
      const msg = message.toLowerCase();

      // Deep analysis patterns for comprehensive responses
      if (msg.includes('pricing') || msg.includes('calculate') || msg.includes('vat') || msg.includes('margin')) {
        const recentCalcs = userCalculations.slice(0, 3);
        response = `**💰 Pricing Intelligence Assistant**

Based on your account data:
• You have **${userCalculations.length} calculations** in your history
• Recent calculations: ${recentCalcs.length ? recentCalcs.map(c => c.hotelName).join(', ') : 'None yet'}

**Advanced Pricing Features:**
• **Smart VAT Calculation**: Automatic 7%/19% rates with regional detection
• **Dynamic Margin Analysis**: Real-time profitability optimization
• **Market Comparison**: Competitive pricing benchmarks
• **Seasonality Factors**: Demand-based pricing adjustments
• **Revenue Forecasting**: Predictive analytics for booking trends

**Quick Actions:**
1. Create new calculation: Go to Pricing Agent → Enter hotel details
2. Optimize existing: Visit Calculations → Select → Analyze trends
3. Export reports: Any calculation → Export → PDF/Excel options

Need help with specific pricing scenarios? I can guide you through complex calculations!`;

      } else if (msg.includes('hotel') || msg.includes('scrape') || msg.includes('booking') || msg.includes('property')) {
        response = `**🏨 Hotel Data Intelligence**

Your hotel database status:
• **${userHotels.length} hotels** in your system
• Data sources: Booking.com, Hotels.com, Expedia integration ready

**Advanced Hotel Features:**
• **Intelligent Scraping**: Extract rates, availability, reviews, amenities
• **Multi-platform Integration**: Sync across booking platforms
• **Competitive Analysis**: Monitor competitor pricing in real-time
• **Property Categorization**: Auto-classify by stars, location, type
• **Performance Tracking**: Revenue, occupancy, and review metrics

**Data Extraction Examples:**
- Hotel name, star rating, room types
- Current pricing and availability
- Guest reviews and ratings
- Location and amenities data
- Historical pricing trends

**Quick Start:**
1. Pricing Agent → Enter any hotel URL
2. System auto-extracts: name, stars, rooms, pricing
3. Data saved for future calculations and analysis

Want me to walk through extracting specific hotel data?`;

      } else if (msg.includes('export') || msg.includes('pdf') || msg.includes('excel') || msg.includes('report') || msg.includes('download')) {
        response = `**📊 Advanced Export & Reporting**

Available export formats and features:

**PDF Reports:**
• Professional branded calculations with charts
• Market analysis with competitor benchmarks
• Revenue projections and trend analysis
• Custom branding with your hotel logo
• Multi-calculation comparative reports

**Excel Spreadsheets:**
• Live formulas for dynamic recalculation
• Pivot tables for data analysis
• Chart integration for visual insights
• Template downloads for bulk calculations
• Historical data comparison sheets

**Data Export Options:**
• Individual calculations (detailed breakdown)
• Bulk calculation history (all your data)
• Hotel database export (property listings)
• Account data package (complete backup)

**Business Intelligence:**
• Monthly performance summaries
• Seasonal trend analysis
• Profit margin optimization reports
• Market positioning analysis

Export any calculation from Calculations page, or your complete account data from Profile → Export Data.

Need a specific report format? I can guide you through custom exports!`;

      } else if (msg.includes('ocr') || msg.includes('document') || msg.includes('analyze') || msg.includes('upload') || msg.includes('file')) {
        response = `**📄 Document Intelligence & OCR Analysis**

Your OCR analysis status:
• **${userAnalyses.length} documents** processed
• Supported formats: Excel, PDF, CSV, images

**Advanced OCR Capabilities:**
• **Text Extraction**: High-accuracy document parsing
• **Data Pattern Recognition**: Identify pricing structures
• **Financial Analysis**: Detect revenue, costs, margins
• **Trend Identification**: Historical data pattern analysis
• **Competitive Intelligence**: Extract competitor data
• **Automated Insights**: AI-generated recommendations

**Document Types Supported:**
- Hotel financial statements
- Competitor pricing sheets
- Booking platform exports
- Revenue management reports
- Guest feedback summaries
- Market research documents

**Processing Features:**
• Real-time text extraction
• Structured data output
• Visual insight generation
• Downloadable analysis reports
• Integration with pricing calculations

**Quick Process:**
1. OCR Analyzer → Upload document
2. AI processes and extracts key data
3. Get insights: summaries, trends, recommendations
4. Export analysis or integrate with pricing

Upload any hotel-related document for instant intelligent analysis!`;

      } else if (msg.includes('dashboard') || msg.includes('analytics') || msg.includes('metrics') || msg.includes('performance')) {
        const totalRevenue = userCalculations.reduce((sum, calc) => sum + (calc.totalPrice || 0), 0);
        const avgMargin = userCalculations.length ? userCalculations.reduce((sum, calc) => sum + (calc.profitMargin || 0), 0) / userCalculations.length : 0;
        
        response = `**📈 Analytics & Performance Dashboard**

**Your Performance Overview:**
• Total calculations: **${userCalculations.length}**
• Projected revenue: **€${totalRevenue.toFixed(2)}**
• Average profit margin: **${avgMargin.toFixed(1)}%**
• Documents analyzed: **${userAnalyses.length}**

**Key Metrics Available:**
• **Revenue Tracking**: Total projected income
• **Profit Analysis**: Margin optimization insights
• **Calculation Trends**: Frequency and patterns
• **Hotel Performance**: Property-wise analytics
• **Market Position**: Competitive benchmarking

**Advanced Analytics:**
• Time-series analysis of your pricing trends
• Seasonal performance patterns
• Hotel category performance comparison
• VAT impact analysis
• Export frequency and preferences

**Dashboard Features:**
• Real-time calculation updates
• Visual charts and graphs
• Performance alerts and notifications
• Custom metric tracking
• Automated insights generation

Visit Dashboard to see your complete analytics overview with interactive charts!`;

      } else if (msg.includes('help') || msg.includes('guide') || msg.includes('tutorial') || msg.includes('how') || msg.includes('start')) {
        response = `**🚀 Beyond Bookings Platform Guide**

**Core Platform Features:**

**1. 💰 Pricing Agent** (Advanced Calculator)
- Multi-currency VAT calculations (7%/19%)
- Real-time margin optimization
- Hotel data auto-extraction from URLs
- Competitive pricing analysis

**2. 📊 Dashboard** (Analytics Hub)
- Performance metrics and KPIs
- Revenue projections and trends
- Visual charts and insights
- Custom reporting tools

**3. 🏨 Hotels Management**
- Property database with smart scraping
- Multi-platform integration
- Competitive monitoring
- Performance tracking

**4. 📋 Calculations History**
- Complete calculation archive
- Advanced filtering and search
- Bulk operations and exports
- Trend analysis tools

**5. 📄 OCR Analyzer** (Document Intelligence)
- AI-powered document processing
- Financial data extraction
- Automated insights generation
- Multi-format support

**6. 👤 Profile & Settings**
- Account management
- Security settings
- Data export options
- Theme customization

**Quick Start Workflow:**
1. Start at Pricing Agent → Enter hotel URL
2. Review auto-extracted data → Calculate pricing
3. Save → View in Calculations → Export report
4. Analyze trends in Dashboard

What specific feature would you like to explore in detail?`;

      } else if (msg.includes('account') || msg.includes('profile') || msg.includes('settings') || msg.includes('password') || msg.includes('security')) {
        response = `**👤 Account Management & Security**

**Profile Features:**
• Personal information management
• Contact details and preferences
• Account statistics and usage metrics
• Theme customization (light/dark mode)

**Security Controls:**
• **Password Management**: Secure password updates
• **Session Control**: Active session monitoring
• **Data Protection**: Encrypted data storage
• **Access Logs**: Login activity tracking
• **Two-Factor Options**: Enhanced security settings

**Data Management:**
• **Complete Data Export**: Download all your data
• **Calculation Backup**: Full calculation history
• **Document Archive**: OCR analysis results
• **Account Analytics**: Usage statistics and patterns

**Privacy Settings:**
• Data retention preferences
• Export format customization
• Communication preferences
• Analytics opt-in/out controls

**Account Actions:**
• Update profile information
• Change password securely
• Export account data (JSON format)
• Delete account (with confirmation)
• Manage active sessions

Visit Profile page for complete account control. All changes are saved automatically with full audit trails.`;

      } else if (msg.includes('error') || msg.includes('problem') || msg.includes('issue') || msg.includes('bug') || msg.includes('not working')) {
        response = `**🔧 Troubleshooting & Support**

**Common Issues & Solutions:**

**Calculation Problems:**
• VAT not calculating → Check currency settings
• Hotel data not loading → Verify URL format
• Export failing → Check file permissions

**Login/Access Issues:**
• Session expired → Re-login required
• Password reset → Use email recovery
• Data not syncing → Clear browser cache

**Upload/OCR Problems:**
• File not processing → Check format (PDF, Excel, images)
• Analysis incomplete → Wait for processing completion
• Poor text recognition → Ensure good document quality

**Performance Issues:**
• Slow loading → Check internet connection
• Features not responding → Refresh browser
• Data not saving → Verify login status

**Browser Compatibility:**
• Recommended: Chrome, Firefox, Safari (latest versions)
• Enable JavaScript and cookies
• Disable ad blockers for full functionality

**Getting Help:**
1. Check Dashboard for system status
2. Review recent calculations for data integrity
3. Try logout/login to refresh session
4. Clear browser cache and cookies

Describe your specific issue and I'll provide targeted troubleshooting steps!`;

      } else {
        // Intelligent general response based on user activity
        const lastCalc = userCalculations[0];
        const hasData = userCalculations.length > 0 || userAnalyses.length > 0;
        
        response = `**🤖 AI Assistant for Beyond Bookings**

${hasData ? `**Your Activity Summary:**
• Recent calculation: ${lastCalc ? lastCalc.hotelName : 'None'}
• Total calculations: ${userCalculations.length}
• Documents analyzed: ${userAnalyses.length}
` : '**Welcome to Beyond Bookings!** 🎉'}

**I can help you with:**

**💰 Pricing & Calculations**
- VAT calculations and margin optimization
- Hotel pricing strategy and competitive analysis
- Revenue forecasting and seasonal adjustments

**🏨 Hotel Management**
- Property data extraction and management
- Multi-platform integration and monitoring
- Performance analytics and reporting

**📊 Analytics & Insights**
- Dashboard metrics and KPI tracking
- Trend analysis and forecasting
- Custom reporting and exports

**📄 Document Intelligence**
- OCR processing and data extraction
- Financial document analysis
- Automated insights and recommendations

**🛠️ Platform Support**
- Feature tutorials and best practices
- Troubleshooting and optimization
- Account management and security

**Quick Commands:**
• "Calculate pricing for [hotel name]"
• "Analyze my profit margins"
• "Export my calculations"
• "Help with OCR upload"
• "Show my dashboard metrics"

What would you like to work on today? I'm here to make your hotel pricing more intelligent and profitable!`;
      }

      res.json({ 
        message: response,
        context: {
          userStats: {
            calculations: userCalculations.length,
            analyses: userAnalyses.length,
            hotels: userHotels.length
          }
        }
      });
    } catch (error) {
      console.error("AI Chat error:", error);
      res.status(500).json({ message: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment, or contact support if the issue persists." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
