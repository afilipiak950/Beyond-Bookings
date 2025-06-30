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
- **Provider**: Replit OIDC authentication
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **Authorization**: Role-based access control (admin/user roles)
- **Security**: Secure cookies, CSRF protection, session timeouts

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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```