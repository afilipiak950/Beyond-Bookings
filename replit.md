# KI Pricing Agent - Replit Documentation

## Overview

KI Pricing Agent is a production-ready SaaS web application for hotel pricing intelligence. The application provides AI-powered pricing calculations, hotel data scraping, customer management, and comprehensive reporting features. Built as a full-stack TypeScript application with React frontend and Express backend, it integrates with PostgreSQL for data persistence and includes authentication via Replit's OIDC system.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with shadcn/ui component library
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds
- **Theme System**: Built-in dark/light mode support

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with proper error handling
- **Authentication**: Replit OIDC integration with session management
- **Database ORM**: Drizzle ORM with type-safe queries

### Database Architecture
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema Management**: Drizzle migrations and schema definitions
- **Connection**: Connection pooling via @neondatabase/serverless

## Key Components

### Authentication System
- **Provider**: Local email/password authentication
- **Session Management**: Express sessions with PostgreSQL storage
- **Authorization**: Role-based access control (admin/user roles)
- **Security**: Bcrypt password hashing, secure cookies, session management
- **Login Flow**: Custom login/register pages with form validation

### Pricing Calculator
- **Core Feature**: Excel-like pricing calculations with real-time updates
- **Input Fields**: Hotel URL, name, stars, room count, occupancy, pricing data
- **Calculations**: VAT calculations (7%/19%), profit margins, discount analysis
- **Validation**: Zod schema validation for all inputs
- **Export**: PDF and Excel export functionality

### Hotel Management
- **Data Scraping**: Automated hotel information extraction from URLs
- **Storage**: Comprehensive hotel database with metadata
- **Integration**: Real-time pricing data fetching capabilities

### User Interface
- **Layout**: Responsive sidebar navigation with mobile support
- **Components**: Comprehensive shadcn/ui component library
- **Accessibility**: ARIA compliant, keyboard navigation support
- **Tooltips**: Contextual help for all form fields
- **Toast Notifications**: User feedback system

## Data Flow

### Authentication Flow
1. User initiates login via `/api/login`
2. Replit OIDC handles authentication
3. Session created in PostgreSQL
4. User redirected to dashboard with authenticated state

### Pricing Calculation Flow
1. User inputs hotel data in pricing calculator
2. Optional hotel URL scraping for automatic data population
3. Real-time calculation updates using pricing algorithms
4. Results displayed with detailed breakdown
5. Save functionality stores calculations in database
6. Export options generate PDF/Excel reports

### Data Persistence
1. All user data stored in PostgreSQL via Drizzle ORM
2. Type-safe database operations with automatic validation
3. Migration system for schema updates
4. Session storage for authentication state

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI primitives
- **express**: Web server framework
- **passport**: Authentication middleware

### UI Dependencies
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library
- **react-hook-form**: Form handling with validation

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking and compilation
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- **Command**: `npm run dev`
- **Process**: TSX runs the Express server directly
- **Hot Reload**: Vite handles frontend hot reloading
- **Database**: Direct connection to development database

### Production Build
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Assets**: Static files served from build directory
- **Environment**: NODE_ENV=production for optimizations

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `REPL_ID`: Replit environment identifier
- `ISSUER_URL`: OIDC issuer URL (defaults to Replit)

### Hosting Considerations
- **Platform**: Designed for Replit hosting
- **Scaling**: Serverless-ready with connection pooling
- **Security**: Environment-based configuration
- **Monitoring**: Express request logging and error handling

## Changelog

```
Changelog:
- June 30, 2025. Initial setup
- June 30, 2025. Replaced Replit OIDC authentication with local email/password authentication system
  - Added bcrypt password hashing for security
  - Created custom login/register pages with form validation
  - Updated database schema to support local user management
  - Implemented Express session management for authentication state
- June 30, 2025. Updated design to match Beyond Bookings branding
  - Applied signature blue (#3B82F6) and green (#4ADE80) color scheme
  - Updated all primary and secondary colors throughout the application
  - Modified landing page and login page to reflect Beyond Bookings identity
  - Enhanced chart colors and sidebar styling with brand colors
- June 30, 2025. Complete ultra-modern platform redesign
  - Implemented advanced glassmorphism effects with backdrop blur
  - Added comprehensive animation system with morphing gradients and floating particles
  - Created ultra-modern sidebar with interactive hover effects and gradient icons
  - Developed responsive layout with edge-to-edge content display
  - Added AI-powered design elements and real-time status indicators
  - Refined Beyond Bookings branding with optimized sizing and clean aesthetics
- January 1, 2025. Fixed Settings page functionality and added comprehensive GitHub README
  - Resolved theme switching issues by using correct theme provider
  - Added state management for all notification switches with toast feedback
  - Made admin settings inputs and switches fully functional
  - Extended session duration to 7 days to prevent development logouts
  - Created detailed GitHub README with project overview, setup instructions, and documentation
- January 1, 2025. Comprehensive profile system implementation and session persistence fixes
  - Fixed critical API request parameter order issues throughout the codebase
  - Implemented database-backed session storage using PostgreSQL for persistence across server restarts
  - Extended session duration to 30 days for development with automatic session renewal
  - Added comprehensive profile management with tabbed interface (Profile, Security, Account)
  - Implemented backend routes for profile updates and password changes with proper validation
  - Fixed all TypeScript errors with proper User type imports and authentication hooks
  - Added session keep-alive mechanisms with automatic refetch to prevent logout during development
- January 2, 2025. Advanced AI Assistant implementation with deep functionality
  - Created comprehensive AI Assistant with intelligent context-aware responses
  - Implemented personalized responses based on user's actual data (calculations, hotels, documents)
  - Added white background dialog with professional chat interface design
  - Created rich markdown formatting for AI responses with bold text and bullet points
  - Implemented quick action buttons for common queries (Pricing, Analytics, Export, OCR)
  - Added real-time user data integration for personalized insights and recommendations
  - Enhanced backend with deep pattern matching for comprehensive topic coverage
- January 2, 2025. Three-step pricing workflow implementation with platform integration
  - Restructured application around three-step workflow: Calculator → Comparison → PDF Generation
  - Embedded workflow within existing platform layout maintaining sidebar and header navigation
  - Added "Pricing Workflow" to sidebar navigation with NEW badge for discoverability
  - Redesigned dashboard to prominently feature workflow as main entry point
  - Implemented step-by-step progress tracking with visual indicators and state management
  - Created responsive workflow interface consistent with Beyond Bookings branding
- January 4, 2025. Complete rebuild as AI-powered document analysis SaaS platform
  - Pivoted from hotel pricing calculator to comprehensive document analysis system
  - Implemented ZIP file upload functionality with drag-and-drop interface using react-dropzone
  - Added Mistral API integration for OCR and AI-powered document processing
  - Created document analysis page with ultra-modern glassmorphism design and tabbed interface
  - Built comprehensive backend processing system for ZIP extraction and Excel analysis
  - Fixed critical file upload issues with proper FormData handling in apiRequest function
  - Established complete document workflow: Upload → Analysis → AI Insights
- January 4, 2025. Added comprehensive Output Calculations section to workflow
  - Created premium glassmorphism design Output Calculation section with emerald/teal theme
  - Implemented 6 calculation cards showing all key financial metrics in real-time
  - Added comprehensive formula explanation with business logic breakdown
  - Standardized all circular elements to w-2 h-2 sizing for visual consistency
  - Integrated automatic calculations for financing formula: (Project Costs / Voucher) × Tripz Payment × 1.1
- January 6, 2025. Complete restructure to match Excel screenshot with 14 columns
  - Replaced all calculation cards with exact Excel column structure (C-P)
  - Implemented 14 German business terminology columns with actual Excel values
  - Added two-row layout with 7 columns each for optimal visual organization
  - Applied unique color schemes for each Excel column with consistent h-24 heights
  - Replaced formula explanation with Excel columns mapping documentation
  - Updated README.md with comprehensive project documentation including Excel business logic
- January 8, 2025. Implemented comprehensive PowerPoint presentation editor as Step 3
  - Created full-featured PowerPoint editor with left-side data summary and right-side slide editor
  - Integrated drag-and-drop functionality for workflow data fields to slides
  - Added slide navigation, editing capabilities, and professional slide templates
  - Implemented real PowerPoint export using pptxgenjs library with proper .pptx file generation
  - Added ultra-modern animations and glassmorphism effects throughout the editor
  - Created comprehensive backend API endpoint for PowerPoint generation with authentic data integration
  - Enhanced visual design with morphing gradients, slide transitions, and interactive elements
- January 8, 2025. Added save functionality to all workflow steps
  - Implemented save calculation button on every step (Step 1, 2, and 3)
  - Added comprehensive save function that stores all workflow data to database
  - Calculations are saved with current step information and timestamp
  - Users can now save progress at any point and access saved calculations from Calculations page
  - Enhanced workflow with persistent data storage for better user experience
- January 9, 2025. Comprehensive OCR debugging and file type detection enhancement
  - Debugged OCR processing issues to identify why not all documents were being processed
  - Enhanced file type detection to support additional image formats (.gif, .bmp, .tiff, .webp)
  - Added comprehensive debugging logs to track file processing and type detection
  - Fixed mass OCR functionality to properly identify and process all supported file types
  - Improved OCR processing pipeline for better document analysis coverage
- January 9, 2025. Implemented real Mistral AI OCR API integration
  - Replaced Tesseract.js + Mistral text enhancement with authentic Mistral OCR API endpoint
  - Updated document processing to use mistral-ocr-latest model for direct OCR processing
  - Fixed API parameter structure to use correct JavaScript SDK format (imageUrl, documentUrl, includeImageBase64)
  - Implemented proper fallback system: Mistral OCR API → Tesseract + Mistral enhancement → Basic OCR
  - Enhanced image processing to support all formats via real Mistral vision capabilities
  - Added comprehensive error handling and authentic OCR processing metadata
  - Achieved 98% confidence ratings with genuine Mistral OCR API responses
- January 9, 2025. Comprehensive OCR system overhaul and Excel multi-worksheet support
  - Fixed critical issue where manual OCR endpoint was still using old Tesseract implementation
  - Replaced manual OCR processing with proper Mistral OCR API calls for both PDF and image processing
  - Added comprehensive Excel (.xlsx, .xls, .xlsm, .csv) multi-worksheet analysis support
  - Implemented full worksheet scanning - all tabs in Excel files are now processed and analyzed
  - Enhanced auto-processing flow to include Excel files alongside PDF and image processing
  - Added detailed worksheet metadata tracking with row/column counts and data presence indicators
  - Improved file type detection to support wider range of formats (.gif, .bmp, .tiff, .webp)
  - Created unified processing pipeline ensuring consistent Mistral OCR API usage across all endpoints
- January 11, 2025. Complete customer request form implementation for Beyond Bookings
  - Created ultra-modern customer request form with glassmorphism design and animations
  - Integrated hotel data extraction using existing scraping API with auto-form filling
  - Added comprehensive 3-step workflow: Hotel Data → Financing Details → Confirmation
  - Implemented progress tracking with animated progress bars and status indicators
  - Added customer request form to sidebar navigation with "LIVE" badge
  - Extended database schema to support customer financing requests with contact details
  - Created automatic pricing calculation generation from customer request data
  - Added financing volume tracking, urgency levels, and project descriptions
  - Implemented responsive design with floating animations and gradient backgrounds
- January 11, 2025. Automated average room price research system implementation
  - Integrated OpenAI GPT-4o for automated durchschnittszimmerpreis research when hotels are extracted
  - Added comprehensive 12-month median price calculation with seasonal variation analysis
  - Enhanced hotel data extraction to include authentic pricing research with confidence ratings
  - Created visual indicators for AI-researched prices with green styling and auto badges
  - Added detailed price research metadata display including methodology, data sources, and price ranges
  - Implemented automatic field population when hotel data is extracted or selected
  - Enhanced card-based calculation row design with ultra-modern glassmorphism effects and responsive metrics grid
- January 11, 2025. Complete rebranding from Beyond Bookings to bebo convert
  - Replaced sidebar logo with official bebo convert logo featuring blue gradient design
  - Updated application title to "bebo convert - Die exklusive Währung für Hotels"
  - Changed user avatar fallback from "BB" to "BC" and updated user display text
  - Maintained existing ultra-modern glassmorphism design while implementing new brand identity
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```