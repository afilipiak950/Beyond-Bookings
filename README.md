# KI Pricing Agent 🏨

A comprehensive AI-powered hotel pricing SaaS platform that leverages advanced data analytics, web scraping, and intelligent pricing recommendations to empower hotel owners and management companies.

## 🌟 Features

### Core Functionality
- **AI-Powered Pricing Calculator**: Excel-like interface with real-time VAT calculations (7%/19%), profit margins, and discount analysis
- **Hotel Data Management**: Automated hotel information extraction from URLs with comprehensive metadata storage
- **OCR Document Analysis**: Upload and analyze Excel documents with AI-powered insights using Mistral OCR API
- **Advanced Web Scraping**: Extract pricing and availability data from hotel booking platforms
- **Customer Management**: Comprehensive customer database with relationship tracking
- **Intelligent Reporting**: Interactive dashboards with charts and analytics

### Authentication & Security
- **Local Authentication**: Secure email/password authentication with bcrypt hashing
- **Role-Based Access Control**: Admin and user roles with different permission levels
- **Session Management**: Persistent sessions with PostgreSQL storage
- **Data Security**: Secure API endpoints with proper authorization

### Export & Integration
- **Multi-Format Export**: PDF and Excel export functionality for pricing calculations
- **Data Portability**: Complete account data export capabilities
- **API Integration**: RESTful API design for third-party integrations

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **TailwindCSS** with shadcn/ui for modern, responsive design
- **TanStack Query** for efficient server state management
- **Wouter** for lightweight client-side routing
- **Vite** for fast development and optimized builds
- **Framer Motion** for smooth animations and interactions

### Backend
- **Node.js** with Express server
- **TypeScript** with ES modules for type safety
- **Drizzle ORM** for type-safe database operations
- **PostgreSQL** with connection pooling via Neon serverless
- **Express Sessions** with database storage
- **Passport.js** for authentication middleware

### Design System
- **Ultra-Modern Glassmorphism**: Advanced backdrop blur effects and morphing gradients
- **Beyond Bookings Branding**: Signature blue (#3B82F6) and green (#4ADE80) color scheme
- **Dark/Light Theme**: Seamless theme switching with system preference detection
- **Responsive Layout**: Mobile-first design with edge-to-edge content display

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/ki-pricing-agent.git
cd ki-pricing-agent
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file in the root directory:
```env
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_secure_session_secret
MISTRAL_API_KEY=your_mistral_ocr_api_key
NODE_ENV=development
```

4. **Set up the database**
```bash
# Push database schema
npm run db:push

# Optional: Generate and run migrations
npm run db:generate
npm run db:migrate
```

5. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 📁 Project Structure

```
ki-pricing-agent/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages/routes
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions and configurations
│   │   └── App.tsx         # Main application component
├── server/                 # Backend Express server
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Database operations and storage interface
│   ├── localAuth.ts        # Authentication middleware
│   ├── db.ts              # Database connection setup
│   └── index.ts           # Server entry point
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Database schema definitions
├── uploads/               # File upload storage
└── package.json           # Project dependencies and scripts
```

## 🏗️ Architecture

### Database Schema
- **Users**: Authentication and profile management
- **Hotels**: Hotel information and metadata
- **Pricing Calculations**: Pricing analysis results with VAT calculations
- **OCR Analyses**: Document analysis results and insights
- **Feedback**: User feedback and rating system
- **Sessions**: Secure session storage

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user

#### Pricing Calculations
- `GET /api/pricing-calculations` - List user's calculations
- `POST /api/pricing-calculations` - Create new calculation
- `PUT /api/pricing-calculations/:id` - Update calculation
- `DELETE /api/pricing-calculations/:id` - Delete calculation

#### Hotel Management
- `GET /api/hotels` - List hotels
- `POST /api/hotels` - Add new hotel
- `POST /api/hotels/scrape` - Scrape hotel data from URL

#### OCR Analysis
- `GET /api/ocr-analyses` - List analyses
- `POST /api/ocr-analyses/upload` - Upload and analyze document
- `GET /api/ocr-analyses/:id/export` - Export analysis results

## 🎨 Design System

### Color Palette
- **Primary Blue**: #3B82F6 (Beyond Bookings signature)
- **Secondary Green**: #4ADE80 (Accent and success states)
- **Background**: Dynamic glassmorphism with backdrop blur
- **Text**: High contrast with proper accessibility ratios

### Components
- **Cards**: Glassmorphism effect with subtle borders
- **Buttons**: Gradient backgrounds with hover animations
- **Forms**: Floating labels with real-time validation
- **Charts**: Interactive data visualizations with brand colors

## 🔧 Development Scripts

```bash
# Development
npm run dev              # Start development server with hot reload

# Database
npm run db:push          # Push schema changes to database
npm run db:generate      # Generate migration files
npm run db:migrate       # Run database migrations
npm run db:studio        # Open Drizzle Studio for database management

# Production
npm run build            # Build for production
npm start                # Start production server

# Testing
npm run test             # Run test suite
npm run test:watch       # Run tests in watch mode
```

## 🚀 Deployment

### Replit Deployment (Recommended)
1. Import the repository to Replit
2. Set environment variables in Replit Secrets
3. The application will automatically deploy with the configured workflow

### Manual Deployment
1. Build the application: `npm run build`
2. Set production environment variables
3. Start the server: `npm start`
4. Configure reverse proxy (nginx) if needed

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Secret key for session encryption | Yes |
| `MISTRAL_API_KEY` | API key for OCR analysis | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |

## 📊 Features Overview

### Pricing Calculator
- Real-time VAT calculations (7% and 19% rates)
- Profit margin analysis
- Market discount comparison
- Excel-like interface with immediate updates
- Save and manage multiple calculations

### OCR Document Analyzer
- Upload Excel files for AI analysis
- Extract key metrics and insights
- Generate comprehensive reports
- Export analysis results in multiple formats
- Bulk processing capabilities

### Hotel Management
- Automated data extraction from booking URLs
- Comprehensive hotel database
- Real-time pricing data integration
- Performance analytics and reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style
- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Write meaningful commit messages
- Add tests for new functionality

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Documentation](docs/) - Detailed project documentation
- [API Reference](docs/api.md) - Complete API documentation
- [Contributing Guide](CONTRIBUTING.md) - How to contribute to the project
- [Changelog](CHANGELOG.md) - Version history and updates

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review existing issues for solutions

---

**Built with ❤️ for the hospitality industry**

*Empowering hotels with AI-driven pricing intelligence and comprehensive management tools.*