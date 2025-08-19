# KI Pricing Agent - Replit Documentation

## Overview
KI Pricing Agent, rebranded as "bebo convert", is a production-ready SaaS web application designed for hotel pricing intelligence and document analysis. Its core purpose is to provide AI-powered pricing calculations, hotel data scraping, customer management, and comprehensive reporting. The platform has evolved to include advanced document analysis capabilities, allowing users to upload and process various file types (PDFs, images, Excel) for automated OCR and data extraction using Mistral AI. It also features a multi-step workflow for pricing calculations, financial analysis, and PowerPoint presentation generation. 

**Recent Major Enhancement (August 2025)**: Comprehensive approval workflow system with role-based access control, user management interface, and input hash validation for maintaining approval integrity. The business vision is to provide hotels with an exclusive currency for managing and optimizing their pricing and financial data.

**Latest Update (August 19, 2025)**: 
- Disabled all fade-in and slide-in animations platform-wide for instant page transitions, providing immediate content display across all pages and components.
- **MAJOR AI ENHANCEMENT**: Implemented comprehensive AI Assistant system based on detailed build brief requirements:
  - Added `/ai` route (in addition to existing `/ai-hub`) for standardized access
  - Comprehensive tool system: `calc_eval`, `sql_query`, `sheets_read`, `docs_search`, `http_call`, `feedback_submit`
  - Enhanced OpenAI integration with function calling and proper tool definitions
  - Citations system for all tool outputs (file+range, table+query, API endpoints)
  - Admin interface at `/ai/admin` with metrics, document management, and logs
  - Self-learning feedback system with rating collection
  - Security controls: SQL SELECT-only, HTTP endpoint whitelist, cost limits
  - Comprehensive system prompts and routing policy (Kalkulation > SQL > Sheets > Docs/RAG > HTTP > Calc)
  - New chat clearing functionality fixed for proper thread management

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with shadcn/ui components, implementing a responsive, ultra-modern glassmorphism design with animations, morphing gradients, and floating particles. The application adheres to the official BeBo Corporate RGB color palette (Primary Blue, Secondary Blue, Light Gray, Primary Green, Light Green, Dark Gray).
- **State Management**: TanStack Query for server state, React hooks for local state.
- **Routing**: Wouter for client-side routing.
- **Build Tool**: Vite for development and production builds.
- **Theme System**: Built-in dark/light mode support.

### Backend Architecture
- **Runtime**: Node.js with Express server.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful endpoints with robust error handling.
- **Authentication**: Local email/password authentication with bcrypt hashing, session management via Express sessions stored in PostgreSQL, and role-based access control.
- **Database ORM**: Drizzle ORM for type-safe queries.

### Database Architecture
- **Database**: PostgreSQL (configured for Neon serverless).
- **Schema Management**: Drizzle migrations and schema definitions.
- **Connection**: Connection pooling via @neondatabase/serverless.

### Key Features & Design Decisions
- **Pricing Calculator**: Excel-like calculation interface with real-time updates, supporting VAT calculations, profit margins, and discount analysis. Includes PDF and Excel export.
- **Hotel Management**: Comprehensive data extraction system with multi-platform review integration. Features automated hotel data scraping, OpenAI GPT-4o powered average room price research, and complete review extraction from Booking.com, Google Reviews, HolidayCheck, and TripAdvisor with clickable links, ratings, and AI-generated summaries.
- **Document Analysis Workflow**:
    - **Step 1 (Upload)**: ZIP file upload with drag-and-drop, processing PDFs, images, and Excel files.
    - **Step 2 (Analysis)**: AI-powered OCR using Mistral AI for document processing and multi-worksheet Excel analysis. Features an "Output Calculations" section presenting 14 key financial metrics based on Excel column structures.
    - **Step 3 (PowerPoint Generation)**: Full-featured PowerPoint editor with drag-and-drop workflow data, slide navigation, editing, and `.pptx` export using `pptxgenjs`.
- **Approval Workflow System** (NEW):
    - **Role-Based Access Control**: User, manager, and admin roles with specific permissions and business value thresholds
    - **Business Rule Validation**: Automatic approval requirements based on star category limits, profit margins (<27%), and financing amounts (>€50k)
    - **Input Hash Tracking**: SHA-256 hash validation ensures approvals remain valid only when calculation inputs haven't changed
    - **Status Badge System**: Real-time status indicators (none_required, required_not_sent, pending, approved, rejected) on calculations page
    - **User Management Interface**: Admin-only user creation, role management, and "Last Admin" protection
    - **Approval Management**: Comprehensive admin dashboard for reviewing, approving, and rejecting calculations with business justifications
- **User Interface**: Responsive sidebar navigation, comprehensive shadcn/ui component library, ARIA compliant, keyboard navigation support, contextual tooltips, and toast notifications. Adheres to BeBo Corporate Design.
- **Session Management**: Database-backed session storage with extended duration and automatic renewal.
- **Profile System**: Comprehensive user profile management with tabbed interface for profile, security, and account settings.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection.
- **drizzle-orm**: Type-safe database ORM.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/react-***: Accessible UI primitives.
- **express**: Web server framework.
- **passport**: Authentication middleware.
- **bcrypt**: Password hashing.
- **react-dropzone**: Drag-and-drop file uploads.
- **pptxgenjs**: PowerPoint presentation generation.
- **OpenAI API**: For automated average room price research (GPT-4o).
- **Mistral AI API**: For OCR and AI-powered document processing (`mistral-ocr-latest` model).

### UI Dependencies
- **tailwindcss**: Utility-first CSS framework.
- **class-variance-authority**: Component variant management.
- **lucide-react**: Icon library.
- **react-hook-form**: Form handling with validation.

### Development Dependencies
- **vite**: Build tool and dev server.
- **typescript**: Type checking and compilation.
- **tsx**: TypeScript execution for development.