# KI Pricing Agent 🏨

A comprehensive AI-powered hotel pricing and business analytics SaaS platform that transforms complex financial calculations into intuitive, data-driven workflows through intelligent document analysis and dynamic business intelligence.

## 🌟 Overview

KI Pricing Agent is a production-ready web application designed for hotel industry professionals, providing sophisticated pricing analysis tools, document processing capabilities, and financial calculations based on German business logic. The platform features a modern three-step workflow system with Excel-integrated calculations matching industry standards.

## ✨ Key Features

### 🧮 Advanced Financial Calculator
- **Excel-Integrated Calculations**: 14 specific calculation columns (C-P) matching industry Excel templates
- **German Business Logic**: Comprehensive financial calculations with proper VAT handling (7%/19%)
- **Real-Time Updates**: Dynamic calculations with immediate visual feedback
- **Professional Layout**: Glassmorphism design with color-coded calculation cards

### 📊 Three-Step Workflow System
1. **Calculator**: Input hotel data and project costs for financial analysis
2. **Comparison**: Market analysis and competitive pricing evaluation  
3. **PDF Generation**: Professional reporting with comprehensive analysis results

### 📄 Document Analysis Engine
- **ZIP File Processing**: Upload and analyze multiple Excel documents simultaneously
- **AI-Powered OCR**: Extract text and data from images and PDFs using Tesseract.js
- **Mistral AI Integration**: Advanced document insights and business intelligence
- **Comprehensive Reports**: Detailed analysis with trends, recommendations, and visualizations

### 🏨 Hotel Management System
- **Data Scraping**: Automated hotel information extraction from booking URLs
- **Comprehensive Database**: Store hotel metadata, pricing history, and performance metrics
- **Real-Time Integration**: Live pricing data and availability tracking

### 🔐 Enterprise Authentication
- **Local Authentication**: Secure email/password system with bcrypt encryption
- **Role-Based Access**: Admin and user roles with granular permissions
- **Session Persistence**: Database-backed sessions with 30-day duration
- **Security Features**: CSRF protection, secure cookies, and API rate limiting

### 🎨 Ultra-Modern Design System
- **Glassmorphism Effects**: Advanced backdrop blur with morphing gradients
- **Beyond Bookings Branding**: Professional blue (#3B82F6) and green (#4ADE80) theme
- **Dark/Light Modes**: Seamless theme switching with system detection
- **Responsive Design**: Mobile-first approach with edge-to-edge layouts
- **Interactive Elements**: Floating particles, gradient animations, and smooth transitions

## 🛠️ Technology Stack

### Frontend Architecture
- **React 18** with TypeScript for type-safe component development
- **TailwindCSS** with shadcn/ui for consistent design system
- **TanStack Query v5** for efficient server state management and caching
- **Wouter** for lightweight client-side routing
- **Vite** for fast development builds and hot module replacement
- **React Hook Form** with Zod validation for form handling
- **Framer Motion** for smooth animations and micro-interactions

### Backend Infrastructure
- **Node.js** with Express server and TypeScript
- **Drizzle ORM** for type-safe database operations and migrations
- **PostgreSQL** with Neon serverless connection pooling
- **Express Sessions** with database storage for authentication
- **Multer** for file upload handling and processing
- **Sharp & Jimp** for image processing and optimization

### AI & Document Processing
- **Mistral AI API** for advanced document analysis and insights
- **Tesseract.js** for OCR text extraction from images
- **PDF2Pic** for PDF to image conversion
- **AdmZip** for ZIP file extraction and processing
- **XLSX** for Excel file parsing and data extraction

### Development Tools
- **TypeScript** with strict mode for enhanced type safety
- **ESLint & Prettier** for code quality and formatting
- **Drizzle Kit** for database migrations and schema management
- **TSX** for TypeScript execution in development

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ with npm/yarn
- PostgreSQL database (local or cloud)
- Mistral AI API key for document analysis

### Installation Steps

1. **Clone and Setup**
```bash
git clone https://github.com/your-username/ki-pricing-agent.git
cd ki-pricing-agent
npm install
```

2. **Environment Configuration**
Create `.env` file with required variables:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ki_pricing_agent

# Authentication
SESSION_SECRET=your-super-secure-session-secret-key

# AI Services
MISTRAL_API_KEY=your-mistral-api-key

# Application
NODE_ENV=development
```

3. **Database Setup**
```bash
# Push schema to database
npm run db:push

# Optional: Generate migration files
npm run db:generate
```

4. **Start Development Server**
```bash
npm run dev
```
Application runs at `http://localhost:5000`

## 📁 Project Architecture

```
ki-pricing-agent/
├── client/                          # Frontend React Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── layout/              # Layout components (sidebar, header)
│   │   │   └── pricing/             # Pricing-specific components
│   │   ├── pages/
│   │   │   ├── auth/                # Login, register, profile pages
│   │   │   ├── dashboard.tsx        # Main dashboard
│   │   │   ├── workflow.tsx         # Three-step pricing workflow
│   │   │   ├── documents.tsx        # Document analysis interface
│   │   │   └── settings.tsx         # User settings and preferences
│   │   ├── hooks/
│   │   │   ├── useAuth.ts           # Authentication state management
│   │   │   ├── useTheme.ts          # Theme switching logic
│   │   │   └── use-toast.ts         # Toast notification system
│   │   ├── lib/
│   │   │   ├── queryClient.ts       # TanStack Query configuration
│   │   │   ├── utils.ts             # Utility functions
│   │   │   └── authUtils.ts         # Authentication helpers
│   │   └── App.tsx                  # Main application component
├── server/                          # Backend Express Server
│   ├── routes.ts                    # API endpoint definitions
│   ├── storage.ts                   # Database operations interface
│   ├── localAuth.ts                 # Authentication middleware
│   ├── db.ts                        # Database connection setup
│   ├── documentProcessor.ts         # Document analysis engine
│   ├── aiPriceIntelligence.ts      # AI pricing calculations
│   └── index.ts                     # Server entry point
├── shared/                          # Shared Type Definitions
│   └── schema.ts                    # Drizzle database schema
├── uploads/                         # File Storage Directory
│   ├── extracted/                   # Extracted ZIP contents
│   └── processed/                   # Processed documents
└── package.json                     # Dependencies and scripts
```

## 🗄️ Database Schema

### Core Tables
- **users**: User accounts with authentication and profile data
- **sessions**: Secure session storage with expiration handling
- **hotels**: Hotel information and metadata
- **pricing_calculations**: Financial calculations with Excel-based data
- **document_uploads**: Uploaded files with processing status
- **document_analyses**: Analysis results from processed documents
- **document_insights**: AI-generated insights and recommendations
- **ocr_analyses**: OCR text extraction results
- **ai_price_intelligence**: Machine learning pricing data
- **ai_learning_sessions**: AI model training sessions
- **feedback**: User feedback and system improvement data

### Key Relationships
- Users have many pricing calculations, documents, and analyses
- Document uploads link to analyses and insights
- AI price intelligence connects to user behavior patterns
- Feedback system tracks user satisfaction and suggestions

## 🔧 API Documentation

### Authentication Endpoints
```typescript
POST   /api/auth/login              // User login with email/password
POST   /api/auth/register           // New user registration
POST   /api/auth/logout             // Session termination
GET    /api/auth/user               // Current user profile
PUT    /api/auth/profile            // Update user profile
PUT    /api/auth/password           // Change password
```

### Pricing & Calculations
```typescript
GET    /api/pricing-calculations    // List user calculations
POST   /api/pricing-calculations    // Create new calculation
PUT    /api/pricing-calculations/:id // Update existing calculation
DELETE /api/pricing-calculations/:id // Delete calculation
GET    /api/pricing-calculations/:id/export // Export as PDF/Excel
```

### Hotel Management
```typescript
GET    /api/hotels                  // List all hotels
POST   /api/hotels                  // Add new hotel
PUT    /api/hotels/:id              // Update hotel information
DELETE /api/hotels/:id              // Remove hotel
POST   /api/hotels/scrape           // Scrape data from URL
```

### Document Processing
```typescript
POST   /api/documents/upload        // Upload ZIP files for analysis
GET    /api/documents               // List uploaded documents
GET    /api/documents/:id           // Get specific document analysis
DELETE /api/documents/:id           // Delete document and analysis
GET    /api/documents/:id/insights  // Get AI insights
POST   /api/documents/:id/reprocess // Reprocess document
```

### AI & Intelligence
```typescript
POST   /api/ai/chat                 // AI assistant conversation
GET    /api/ai/price-intelligence   // Get pricing recommendations
POST   /api/ai/feedback             // Submit AI feedback
GET    /api/ai/learning-sessions    // List AI learning sessions
```

## 💼 Business Logic

### Excel Column Mapping
The application implements 14 specific Excel columns (C-P) with German business terminology:

| Column | German Name | English Translation | Purpose |
|--------|-------------|-------------------|---------|
| C | Finanzierung (Förderung) für Hotelbett | Financing (Subsidy) for Hotel Bed | Base financing calculation |
| D | Förderungssumme | Subsidy Amount | Total available subsidies |
| E | Abzug | Deduction | Costs to be deducted |
| F | Buchungsystem | Booking System | System-related costs |
| G | Rabatt Förderung | Discount Subsidy | Promotional discounts |
| H | Lieferant | Supplier | Supplier information |
| I | Lieferant Förderung | Supplier Subsidy | Supplier-related subsidies |
| J | Ankauf vom Lieferant | Purchase from Supplier | Procurement costs |
| K | Marge | Margin | Profit margins |
| L | Verkauf an Hotelbett | Sale to Hotel Bed | Sales figures |
| M | Anzahl | Quantity | Number of units |
| N | UVP | RRP (Recommended Retail Price) | Suggested pricing |
| O | Profit nach Steuern | Profit After Taxes | Net profit calculation |
| P | Profit nach Steuern Förderung | Profit After Taxes Subsidy | Subsidized profit |

### Calculation Workflow
1. **Input Phase**: Manual entry of project costs and hotel data
2. **Processing Phase**: Automatic calculation of all 14 Excel columns
3. **Analysis Phase**: AI-powered insights and recommendations
4. **Export Phase**: Professional PDF reports with charts and analysis

## 🎨 Design System

### Color Palette
```css
/* Primary Colors */
--primary-blue: #3B82F6     /* Beyond Bookings signature blue */
--secondary-green: #4ADE80   /* Accent and success states */
--warning-orange: #F59E0B    /* Warning and attention */
--error-red: #EF4444         /* Error states */
--neutral-gray: #6B7280      /* Text and borders */

/* Glassmorphism Effects */
--glass-bg: rgba(255, 255, 255, 0.1)
--glass-border: rgba(255, 255, 255, 0.2)
--backdrop-blur: blur(12px)
```

### Component Standards
- **Cards**: Consistent h-24 height with glassmorphism effects
- **Circles**: Uniform w-2 h-2 sizing for visual consistency
- **Text**: Responsive sizing with proper break-words
- **Animations**: Smooth transitions with morphing gradients
- **Spacing**: Consistent gap-4 spacing throughout layouts

### Responsive Breakpoints
- **Mobile**: 320px - 768px (1-2 columns)
- **Tablet**: 768px - 1024px (2-3 columns)
- **Desktop**: 1024px - 1440px (3-6 columns)
- **Large**: 1440px+ (6-7 columns for Excel layout)

## 🚀 Development

### Available Scripts
```bash
# Development
npm run dev                    # Start development server with hot reload

# Database Management
npm run db:push               # Push schema changes to database
npm run db:generate           # Generate migration files
npm run db:migrate            # Run pending migrations
npm run db:studio             # Open Drizzle Studio (database GUI)
npm run db:seed               # Seed database with sample data

# Production
npm run build                 # Build optimized production bundle
npm start                     # Start production server
npm run preview               # Preview production build

# Code Quality
npm run lint                  # Run ESLint code analysis
npm run lint:fix              # Fix auto-fixable ESLint issues
npm run type-check            # Run TypeScript type checking
npm run format                # Format code with Prettier
```

### Development Workflow
1. **Feature Development**: Create feature branches from main
2. **Code Quality**: Ensure TypeScript compliance and ESLint passing
3. **Testing**: Test functionality across different screen sizes
4. **Documentation**: Update README and inline comments
5. **Pull Request**: Submit PR with detailed description

### Environment Variables
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | ✅ |
| `SESSION_SECRET` | Session encryption key | `super-secure-random-string` | ✅ |
| `MISTRAL_API_KEY` | Mistral AI API key | `your-mistral-api-key` | ✅ |
| `NODE_ENV` | Environment mode | `development` or `production` | ✅ |
| `PORT` | Server port | `5000` | ❌ |

## 📊 Features Deep Dive

### Three-Step Workflow System
The application is built around a comprehensive three-step workflow:

#### Step 1: Calculator
- Manual input of project costs (required field)
- Hotel data entry with validation
- Real-time Excel column calculations
- Visual feedback with glassmorphism cards
- Progress tracking and data persistence

#### Step 2: Comparison Analysis
- Market positioning evaluation
- Competitive pricing analysis
- Historical data comparison
- Performance metrics visualization
- Industry benchmark analysis

#### Step 3: PDF Report Generation
- Professional document creation
- Comprehensive calculation summary
- Charts and visual analysis
- Export in multiple formats
- Branded report templates

### Document Analysis Engine
- **Multi-Format Support**: Excel, PDF, images, and ZIP archives
- **Intelligent Processing**: AI-powered data extraction and analysis
- **Batch Operations**: Process multiple documents simultaneously
- **Insight Generation**: Business intelligence and recommendations
- **Export Capabilities**: Multiple output formats with detailed reports

### AI Price Intelligence
- **Machine Learning**: Adaptive pricing based on historical data
- **Market Analysis**: Real-time competitive intelligence
- **Recommendation Engine**: AI-suggested pricing strategies
- **Learning System**: Continuous improvement from user feedback
- **Trend Analysis**: Market trend identification and forecasting

## 🔐 Security Features

### Authentication Security
- **Password Hashing**: bcrypt with salt rounds for secure storage
- **Session Management**: Database-backed sessions with automatic expiration
- **CSRF Protection**: Token-based request validation
- **Rate Limiting**: API endpoint protection against abuse
- **Input Validation**: Comprehensive Zod schema validation

### Data Protection
- **Encrypted Storage**: Sensitive data encryption at rest
- **Secure Transmission**: HTTPS enforcement in production
- **File Validation**: Upload type and size restrictions
- **SQL Injection Prevention**: Parameterized queries with Drizzle ORM
- **XSS Protection**: Content Security Policy headers

## 📈 Performance Optimization

### Frontend Optimization
- **Code Splitting**: Dynamic imports for reduced bundle size
- **Image Optimization**: Sharp-based image processing
- **Caching Strategy**: TanStack Query with smart cache invalidation
- **Lazy Loading**: Component-level lazy loading
- **Bundle Analysis**: Webpack bundle analyzer integration

### Backend Optimization
- **Connection Pooling**: PostgreSQL connection pool management
- **Query Optimization**: Efficient database queries with proper indexing
- **File Processing**: Streaming file uploads and processing
- **Memory Management**: Garbage collection optimization
- **API Rate Limiting**: Request throttling for stability

## 🚀 Deployment

### Replit Deployment (Recommended)
1. Import repository to Replit
2. Configure environment variables in Secrets
3. Application auto-deploys with the workflow
4. SSL and domain management handled automatically

### Manual Deployment Options

#### Docker Deployment
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

#### Traditional VPS Deployment
```bash
# Production build
npm run build

# Process manager with PM2
npm install -g pm2
pm2 start npm --name "ki-pricing-agent" -- start
pm2 startup
pm2 save
```

#### Cloud Platform Deployment
- **Vercel**: Frontend deployment with serverless functions
- **Heroku**: Full-stack deployment with PostgreSQL addon
- **Railway**: Simple deployment with automatic database provisioning
- **DigitalOcean**: VPS deployment with managed database

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificate installed
- [ ] Domain name configured
- [ ] Backup strategy implemented
- [ ] Monitoring tools configured
- [ ] Performance testing completed
- [ ] Security audit performed

## 📚 Advanced Usage

### Custom Calculations
The system supports custom calculation formulas:
```typescript
// Example custom calculation
const customCalculation = {
  financing: projectCosts / voucherValue,
  subsidyAmount: baseAmount * subsidyRate,
  margin: salesPrice - purchasePrice,
  profitAfterTax: grossProfit * (1 - taxRate)
};
```

### AI Integration
```typescript
// Mistral AI integration example
const analysis = await mistralClient.chat({
  model: "mistral-large",
  messages: [
    {
      role: "user",
      content: `Analyze this hotel data: ${JSON.stringify(hotelData)}`
    }
  ]
});
```

### Document Processing Pipeline
```typescript
// Document processing workflow
const processDocument = async (file: File) => {
  const extracted = await extractZip(file);
  const analyzed = await analyzeExcel(extracted);
  const insights = await generateInsights(analyzed);
  return { extracted, analyzed, insights };
};
```

## 🤝 Contributing

### Contribution Guidelines
1. **Fork** the repository and create feature branch
2. **Follow** TypeScript and ESLint conventions
3. **Test** functionality across different screen sizes
4. **Document** changes in code comments and README
5. **Submit** pull request with detailed description

### Code Style Standards
- Use TypeScript for all new code
- Follow existing naming conventions
- Write meaningful commit messages
- Add JSDoc comments for functions
- Maintain consistent indentation (2 spaces)

### Testing Guidelines
- Test user authentication flows
- Verify calculation accuracy
- Check responsive design behavior
- Validate form submissions
- Test file upload functionality

## 📝 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for complete terms.

## 🔗 Additional Resources

- **[API Documentation](docs/api.md)** - Complete API reference
- **[User Guide](docs/user-guide.md)** - End-user documentation
- **[Developer Guide](docs/developer.md)** - Technical documentation
- **[Deployment Guide](docs/deployment.md)** - Production deployment instructions
- **[Changelog](CHANGELOG.md)** - Version history and updates

## 🆘 Support & Community

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check comprehensive guides and API reference
- **Community**: Join discussions and share feedback

### Reporting Issues
When reporting issues, include:
- Operating system and browser version
- Steps to reproduce the problem
- Expected vs actual behavior
- Console error messages
- Screenshots if applicable

---

**Built with ❤️ for the hospitality industry**

*Empowering hotels with AI-driven pricing intelligence, comprehensive financial analysis, and modern business tools for the digital age.*

**Version**: 2.0.0 | **Last Updated**: January 2025 | **Node.js**: 18+ | **React**: 18+ | **TypeScript**: 5+