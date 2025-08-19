# AI Assistant - Internal Beyond Bookings Platform

A comprehensive AI-powered assistant for hotel pricing intelligence, document analysis, and business insights.

## Features

- 🧠 **AI Chat Interface** - Conversational AI powered by OpenAI GPT-4o/GPT-4o-mini
- 🧮 **Smart Calculations** - Mathematical expressions with variable support  
- 📊 **Database Queries** - SQL query interface with safety controls
- 📄 **Document Analysis** - Upload and search through PDFs, Excel files, documents
- 🔗 **API Integration** - HTTP calls to whitelisted endpoints
- 📈 **Google Sheets** - Read data from Google Spreadsheets
- 🔄 **Feedback Loop** - User feedback collection for continuous improvement
- 🎯 **Multiple Modes** - General, Calculation, Documents, Database, Sheets, API
- 👥 **Role-Based Access** - Admin and user roles with appropriate permissions
- 💬 **Thread Management** - Persistent conversation threads with search and organization

## Quick Start

1. **Install Dependencies**
```bash
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database Setup**
```bash
npm run db:push
```

4. **Run Development Server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Environment Variables

### Required
- `OPENAI_API_KEY` - OpenAI API key for AI functionality
- `DATABASE_URL` - PostgreSQL database connection string
- `SESSION_SECRET` - Secret key for session management

### Optional
- `GOOGLE_CLIENT_EMAIL` - Google Service Account email for Sheets API
- `GOOGLE_PRIVATE_KEY` - Google Service Account private key
- `AI_HTTP_WHITELIST` - Comma-separated list of allowed HTTP endpoints
- `AI_MAX_TOKENS` - Maximum tokens per request (default: 4096)
- `AI_MAX_COST_EUR_PER_REQUEST` - Maximum cost per request in EUR (default: 0.05)

## Usage

### Accessing the AI Assistant

Navigate to `/ai` or `/ai-hub` in your browser after authentication.

### Available Tools

1. **Calculations** - `calc_eval(expression, variables?)`
   - Safe mathematical expressions using mathjs
   - Supports variables and returns step-by-step solutions

2. **Database Queries** - `sql_query(query, params?)`
   - SELECT-only queries with parameterization
   - Automatic query validation and safety checks

3. **Document Search** - `docs_search(query, topK?)`
   - Semantic search through uploaded documents
   - Returns relevant chunks with citations

4. **Google Sheets** - `sheets_read(spreadsheetId, range)`
   - Read data from Google Sheets
   - Requires proper service account setup

5. **HTTP Calls** - `http_call(endpoint, method, payload?)`
   - Whitelisted HTTP endpoints only
   - Supports GET, POST, PUT, DELETE methods

### Example Queries

**Mathematical Calculations:**
```
Calculate the profit margin if revenue is €50000 and costs are €35000
```

**Database Analysis:**
```
Show me the top 10 hotels by booking volume this month
```

**Document Questions:**
```
What are the key insights from the Q3 financial report?
```

## Architecture

- **Frontend**: React 18 + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI GPT-4o/GPT-4o-mini with function calling
- **Authentication**: Session-based with role-based access control

## Security Features

- SQL injection protection with parameterized queries
- HTTP endpoint whitelisting
- PII redaction in logs
- Role-based access control
- Session management with secure cookies
- Cost and token limits per request

## Development

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/ai-hub.tsx    # Main AI interface
│   │   └── components/         # Reusable UI components
├── server/                 # Express backend
│   ├── ai/
│   │   ├── routes.ts          # AI API endpoints
│   │   ├── tools/             # AI tool implementations
│   │   └── system-prompts/    # AI system prompts
├── shared/                 # Shared types and schemas
└── README.md              # This file
```

### Adding New Tools

1. Create tool implementation in `server/ai/tools/`
2. Add tool definition to `server/ai/tools/index.ts`
3. Update system prompt in `server/ai/system-prompts/assistant.v1.md`

### Testing

The AI Assistant includes built-in testing through the interface:
- Test calculations with various expressions
- Try database queries with different parameters
- Upload sample documents and test search functionality
- Verify HTTP endpoints with whitelisted URLs

## Support

For issues or questions, refer to the project documentation or contact the development team.

## License

Internal use only - Beyond Bookings Platform