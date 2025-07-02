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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```