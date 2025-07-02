import type { Express } from "express";
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

  const httpServer = createServer(app);
  return httpServer;
}
