# KI Pricing Agent - Replit Documentation

## Overview
KI Pricing Agent, rebranded as "bebo convert", is a production-ready SaaS web application designed for hotel pricing intelligence and document analysis. Its core purpose is to provide AI-powered pricing calculations, hotel data scraping, customer management, and comprehensive reporting. The platform has evolved to include advanced document analysis capabilities, allowing users to upload and process various file types (PDFs, images, Excel) for automated OCR and data extraction using Mistral AI. It also features a multi-step workflow for pricing calculations, financial analysis, and PowerPoint presentation generation. The business vision is to provide hotels with an exclusive currency for managing and optimizing their pricing and financial data.

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
- **Hotel Management**: Automated data scraping from URLs and storage in a comprehensive hotel database, with real-time pricing data fetching. Integrates OpenAI GPT-4o for automated average room price research.
- **Document Analysis Workflow**:
    - **Step 1 (Upload)**: ZIP file upload with drag-and-drop, processing PDFs, images, and Excel files.
    - **Step 2 (Analysis)**: AI-powered OCR using Mistral AI for document processing and multi-worksheet Excel analysis. Features an "Output Calculations" section presenting 14 key financial metrics based on Excel column structures.
    - **Step 3 (PowerPoint Generation)**: Full-featured PowerPoint editor with drag-and-drop workflow data, slide navigation, editing, and `.pptx` export using `pptxgenjs`.
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