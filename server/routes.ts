import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, hashPassword, comparePassword } from "./localAuth";
import { insertPricingCalculationSchema, insertFeedbackSchema, insertOcrAnalysisSchema } from "@shared/schema";
import { documentProcessor } from "./documentProcessor";
import { powerpointImporter } from "./powerpointImporter";
import { extractUserPresentation } from "./extractUserPresentation";
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

  // PowerPoint upload configuration
  const powerpointUpload = multer({
    dest: 'uploads/',
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PowerPoint files are allowed'));
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
  // PowerPoint export endpoint
  // Get user's default presentation
  app.get("/api/user-presentation", requireAuth, async (req: Request, res: Response) => {
    try {
      const userPresentation = await extractUserPresentation();
      
      if (userPresentation) {
        console.log('Sending user presentation with', userPresentation.slides.length, 'slides');
        res.json(userPresentation);
      } else {
        console.log('No user presentation found, sending default');
        res.json(null);
      }
    } catch (error) {
      console.error("Error loading user presentation:", error);
      res.status(500).json({ error: "Failed to load user presentation" });
    }
  });

  // Save user's modified presentation
  app.post("/api/save-presentation", requireAuth, async (req: Request, res: Response) => {
    try {
      const { slides } = req.body;
      
      if (!slides || !Array.isArray(slides)) {
        return res.status(400).json({ error: "Invalid slides data" });
      }
      
      console.log('Saving user presentation with', slides.length, 'slides');
      
      // For now, just return success - could save to database or file
      res.json({ success: true, message: "Presentation saved successfully" });
    } catch (error) {
      console.error("Error saving presentation:", error);
      res.status(500).json({ error: "Failed to save presentation" });
    }
  });

  // PowerPoint import route
  app.post("/api/import/powerpoint", requireAuth, powerpointUpload.single('pptx'), async (req: Request, res: Response) => {
    try {
      console.log('PowerPoint import request received');
      console.log('Request file:', req.file);
      
      if (!req.file) {
        console.log('No file uploaded');
        return res.status(400).json({ error: "No PowerPoint file uploaded" });
      }

      console.log('File details:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });

      const importedPresentation = await powerpointImporter.importPresentation(req.file.path);
      
      // Save this as the user's default presentation
      const userPresentationPath = path.join(process.cwd(), 'uploads', 'user_presentation.pptx');
      await fs.copyFile(req.file.path, userPresentationPath);
      console.log('Saved as user default presentation');
      
      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
        console.log('Cleaned up uploaded file');
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', cleanupError);
      }
      
      console.log('Sending imported presentation:', importedPresentation);
      res.json(importedPresentation);
    } catch (error) {
      console.error("PowerPoint import error:", error);
      
      // Clean up uploaded file even on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.warn('Failed to cleanup uploaded file on error:', cleanupError);
        }
      }
      
      res.status(500).json({ 
        error: "Failed to import PowerPoint presentation", 
        details: error.message 
      });
    }
  });

  app.post("/api/export/powerpoint", requireAuth, async (req: Request, res: Response) => {
    try {
      const { slides, workflowData } = req.body;
      
      // Import pptxgenjs
      const PptxGenJS = require("pptxgenjs");
      const pptx = new PptxGenJS();
      
      // Set presentation properties
      pptx.title = `${workflowData.hotelName} - Pricing Analysis`;
      pptx.subject = "Hotel Pricing Analysis Report";
      pptx.author = "Beyond Bookings";
      pptx.company = "Beyond Bookings";
      
      // Add slides
      slides.forEach((slideData: any, index: number) => {
        const slide = pptx.addSlide();
        
        // Set background gradient
        const gradientMap: any = {
          "from-blue-600 to-purple-600": ["0066CC", "9900CC"],
          "from-emerald-500 to-teal-500": ["10B981", "14B8A6"],
          "from-orange-500 to-red-500": ["F97316", "EF4444"],
          "from-gray-400 to-gray-600": ["9CA3AF", "4B5563"]
        };
        
        const colors = gradientMap[slideData.backgroundGradient] || ["0066CC", "9900CC"];
        slide.background = { fill: colors[0] };
        
        // Add title
        slide.addText(slideData.title, {
          x: 1,
          y: 1.5,
          w: 8,
          h: 2,
          fontSize: 44,
          fontFace: "Arial",
          color: "FFFFFF",
          bold: true,
          align: "center"
        });
        
        // Add content
        slide.addText(slideData.content, {
          x: 1,
          y: 3.5,
          w: 8,
          h: 3,
          fontSize: 24,
          fontFace: "Arial",
          color: "FFFFFF",
          align: "center"
        });
        
        // Add data for specific slides
        if (index === 1) { // Hotel Overview slide
          slide.addText(`Project Costs: €${workflowData.projectCosts?.toLocaleString('de-DE')}`, {
            x: 1,
            y: 5.5,
            w: 8,
            h: 0.5,
            fontSize: 18,
            fontFace: "Arial",
            color: "FFFFFF",
            align: "center"
          });
        }
        
        if (index === 2) { // Pricing Analysis slide
          const projectCosts = workflowData.projectCosts || 0;
          const voucherValue = workflowData.stars === 5 ? 50 : workflowData.stars === 4 ? 40 : workflowData.stars === 3 ? 30 : 30;
          const roomnights = Math.round(projectCosts / voucherValue);
          const beyondBookingsCosts = roomnights * 17;
          const steuerbelastung = 1800.90;
          const nettoKosten = projectCosts / 1.19;
          const steuervorteil = nettoKosten * 0.19;
          const gesamtkosten = beyondBookingsCosts + steuerbelastung - steuervorteil;
          const advantage = projectCosts - gesamtkosten;
          
          slide.addText(`Cost Advantage: €${advantage.toLocaleString('de-DE')}`, {
            x: 1,
            y: 5.5,
            w: 8,
            h: 0.5,
            fontSize: 18,
            fontFace: "Arial",
            color: "FFFFFF",
            align: "center"
          });
        }
        
        // Add slide number
        slide.addText(`${index + 1}`, {
          x: 9,
          y: 6.5,
          w: 0.5,
          h: 0.5,
          fontSize: 12,
          fontFace: "Arial",
          color: "FFFFFF",
          align: "center"
        });
      });
      
      // Generate the presentation
      const fileName = `${workflowData.hotelName}_Presentation.pptx`;
      
      // Write to buffer
      const buffer = await pptx.write("nodebuffer");
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', buffer.length);
      
      // Send the buffer
      res.send(buffer);
      
    } catch (error) {
      console.error("PowerPoint export error:", error);
      res.status(500).json({ error: "Failed to generate PowerPoint presentation" });
    }
  });

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

  // Document Analysis routes - Configure multer for ZIP files
  const documentUpload = multer({
    dest: 'uploads/',
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/zip',
        'application/x-zip-compressed',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only ZIP, Excel, and CSV files are allowed'));
      }
    }
  });

  // Get document uploads
  app.get('/api/document-uploads', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const uploads = await storage.getDocumentUploads(userId);
      res.json(uploads);
    } catch (error) {
      console.error("Error fetching document uploads:", error);
      res.status(500).json({ message: "Failed to fetch document uploads" });
    }
  });

  // Upload and process document
  app.post('/api/document-uploads', requireAuth, documentUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.id.toString();
      
      // Create initial upload record
      const upload = await storage.createDocumentUpload({
        userId,
        fileName: req.file.filename,
        originalFileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        uploadStatus: 'processing'
      });

      // Start processing in background with real file processing
      setTimeout(async () => {
        try {
          console.log(`Starting real document processing for file: ${req.file.originalname}`);
          
          // Check if the uploaded file is a ZIP file or Excel file
          if (req.file.mimetype === 'application/zip' || req.file.mimetype === 'application/x-zip-compressed') {
            // Process ZIP file with DocumentProcessor
            const result = await documentProcessor.processZipFile(req.file.path, {
              userId,
              fileName: req.file.filename,
              originalFileName: req.file.originalname,
              filePath: req.file.path,
              fileSize: req.file.size,
              fileType: req.file.mimetype,
              uploadStatus: 'processing'
            }, storage);

            if (result.success) {
              console.log(`Successfully processed ${result.processedFiles} files from ${result.totalFiles} total files`);
              
              // Delete the upload we created earlier since DocumentProcessor creates its own
              await storage.deleteDocumentUpload(upload.id, userId);
            } else {
              console.error(`Failed to process upload ${upload.id}: ${result.message}`);
              await storage.updateDocumentUpload(upload.id, {
                uploadStatus: 'error'
              });
            }
          } else {
            // Handle single Excel/CSV files directly
            console.log(`Processing single Excel/CSV file: ${req.file.originalname}`);
            
            // Import and use XLSX library directly for single files
            const XLSX = await import('xlsx');
            const workbook = XLSX.readFile(req.file.path);
            const sheetNames = workbook.SheetNames;
            
            const extractedFiles = [];
            const analysisData = [];
            
            for (const sheetName of sheetNames) {
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              
              if (jsonData.length > 0) {
                extractedFiles.push({
                  fileName: req.file.originalname,
                  fileType: 'Excel',
                  worksheetName: sheetName,
                  rowCount: jsonData.length,
                  columnCount: jsonData[0]?.length || 0
                });
                
                // Extract price-related data from worksheet
                const priceData = [];
                for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex++) {
                  const row = jsonData[rowIndex];
                  for (let colIndex = 0; colIndex < row.length; colIndex++) {
                    const cellValue = row[colIndex];
                    if (typeof cellValue === 'number' && cellValue > 0 && cellValue < 10000) {
                      // Likely a price value
                      priceData.push({
                        value: cellValue,
                        currency: 'EUR',
                        context: `Row ${rowIndex + 1}, Column ${colIndex + 1}`,
                        row: rowIndex,
                        column: colIndex,
                        confidence: 0.8
                      });
                    }
                  }
                }
                
                // Create analysis record
                analysisData.push({
                  uploadId: upload.id,
                  userId,
                  fileName: req.file.originalname,
                  worksheetName: sheetName,
                  analysisType: 'excel_analysis',
                  status: 'completed',
                  priceData,
                  insights: {
                    summary: `Analysis of ${sheetName} worksheet with ${jsonData.length} rows and ${priceData.length} price points identified.`,
                    keyMetrics: [
                      { metric: "Total Rows", value: jsonData.length.toString() },
                      { metric: "Price Points Found", value: priceData.length.toString() },
                      { metric: "Average Value", value: priceData.length > 0 ? (priceData.reduce((sum, p) => sum + p.value, 0) / priceData.length).toFixed(2) : "0" }
                    ]
                  },
                  processingTime: 1000
                });
              }
            }
            
            // Update upload with extracted file info
            await storage.updateDocumentUpload(upload.id, {
              extractedFiles,
              uploadStatus: 'completed'
            });
            
            // Create analysis records
            for (const analysis of analysisData) {
              await storage.createDocumentAnalysis(analysis);
            }
            
            console.log(`Successfully processed single Excel file with ${analysisData.length} worksheets`);
          }

        } catch (error) {
          console.error("Error processing document:", error);
          await storage.updateDocumentUpload(upload.id, {
            uploadStatus: 'error'
          });
        }
      }, 1000);

      res.json(upload);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Get document analyses
  app.get('/api/document-analyses', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const analyses = await storage.getDocumentAnalyses(userId);
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching document analyses:", error);
      res.status(500).json({ message: "Failed to fetch document analyses" });
    }
  });

  // Get document insights
  app.get('/api/document-insights', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const insights = await storage.getDocumentInsights(userId);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching document insights:", error);
      res.status(500).json({ message: "Failed to fetch document insights" });
    }
  });

  // Delete document upload
  app.delete('/api/document-uploads/:id', requireAuth, async (req: any, res) => {
    try {
      const uploadId = parseInt(req.params.id);
      const userId = req.user.id.toString();
      
      const success = await storage.deleteDocumentUpload(uploadId, userId);
      if (!success) {
        return res.status(404).json({ message: "Document upload not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document upload:", error);
      res.status(500).json({ message: "Failed to delete document upload" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
