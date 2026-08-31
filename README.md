# Agentic Tournament Website Generator Platform

An AI-powered platform that automatically generates fully-functional tournament websites using Claude AI agents.

## 🎯 Overview

Users specify their tournament requirements through an intuitive form, and the platform's AI orchestration system automatically generates complete, production-ready code including:
- React frontend components
- Express backend API
- PostgreSQL database schema
- Configuration files
- External API integrations

Generated websites can be hosted on the platform or deployed by users to Vercel, Netlify, AWS, etc.

## 🏗️ Project Structure

```
agentic-platform/
├── shared/                    # Shared types, schemas, constants
│   ├── schema.ts             # Database schema definitions
│   ├── types.ts              # Shared TypeScript types
│   └── constants.ts          # Shared constants
│
├── server/                   # Express backend
│   ├── index.ts              # Express app setup & middleware
│   ├── routes.ts             # API route handlers
│   ├── storage.ts            # Database interface
│   │
│   ├── ai/                   # AI agent system
│   │   ├── orchestrator.ts   # Main AI orchestrator
│   │   ├── agents/           # Individual agent implementations
│   │   │   ├── specParser.ts
│   │   │   ├── architect.ts
│   │   │   ├── frontend.ts
│   │   │   ├── backend.ts
│   │   │   ├── database.ts
│   │   │   ├── integration.ts
│   │   │   ├── config.ts
│   │   │   └── qa.ts
│   │   ├── prompts/          # Agent prompt templates
│   │   └── types.ts
│   │
│   ├── codegen/              # Code generation engine
│   │   ├── templates/        # EJS/Handlebars templates
│   │   ├── generators/       # File generation logic
│   │   └── validator.ts      # Validate generated code
│   │
│   ├── deployment/           # Deployment & hosting
│   │   ├── platformHost.ts
│   │   ├── githubSync.ts
│   │   └── containerBuilder.ts
│   │
│   ├── queue/                # Job queue (Bull + Redis)
│   │   └── jobQueue.ts
│   │
│   └── utils/                # Utility functions
│       ├── fileSystem.ts
│       ├── gitOperations.ts
│       └── cache.ts
│
├── client/                   # React frontend (SPA)
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.tsx       # Main dashboard
│       │   ├── ProjectForm.tsx     # Specification input form
│       │   ├── GenerationProgress.tsx
│       │   ├── ProjectDetail.tsx
│       │   └── Admin.tsx
│       │
│       ├── components/
│       │   ├── SpecForm/          # Specification form components
│       │   │   ├── BasicInfo.tsx
│       │   │   ├── PagesSelector.tsx
│       │   │   ├── CustomizationOptions.tsx
│       │   │   └── IntegrationSetup.tsx
│       │   │
│       │   ├── ui/                # Shadcn UI components
│       │   └── Layout/
│       │
│       ├── lib/
│       │   ├── api.ts             # API client
│       │   ├── hooks.ts           # React hooks
│       │   └── utils.ts
│       │
│       └── App.tsx
│
├── templates/                # Template references
│   └── reference-website/   # Chess tournament site structure used as reference
│
├── docker/
│   └── Dockerfile           # Container image definition
│
├── .github/
│   └── workflows/           # GitHub Actions CI/CD
│       ├── build.yml
│       └── deploy.yml
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── .env.example
└── README.md (this file)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker (for containerization)
- Azure account (for hosting)

### Installation

1. **Clone & Install**
   ```bash
   cd agentic-platform
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   # Create database
   createdb agentic_platform_dev

   # Run migrations
   npm run db:push
   ```

4. **Start Development Server**
   ```bash
   npm run dev:full
   ```
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - Redis/Postgres: started automatically via Docker Compose

## 📦 Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| AI | Claude 3.5 Sonnet API |
| Caching | Redis |
| Job Queue | Bull |
| Styling | Tailwind CSS |
| Container | Docker |
| Deployment | Azure Container Instances/AKS |

## 🤖 AI Agent System

The platform uses 9 specialized AI agents that work together:

1. **Orchestrator** - Coordinates all agents
2. **Spec Parser** - Validates user specifications
3. **Architect** - Designs project structure
4. **Frontend Agent** - Generates React components
5. **Backend Agent** - Generates Express routes
6. **Database Agent** - Generates Drizzle schemas
7. **Integration Agent** - Sets up external APIs
8. **Config Agent** - Generates configuration files
9. **QA Agent** - Validates generated code

## 📋 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update specification
- `DELETE /api/projects/:id` - Delete project

### Generation
- `POST /api/projects/:id/generate` - Start generation
- `GET /api/projects/:id/generation-status` - Check progress
- `GET /api/projects/:id/generation-logs` - View logs
- `POST /api/projects/:id/regenerate` - Regenerate with changes

### Deployment
- `POST /api/projects/:id/deploy-platform` - Deploy to platform
- `POST /api/projects/:id/push-github` - Push to GitHub
- `GET /api/projects/:id/deployment` - Get deployment status

## 🧪 Development

### Run Tests
```bash
npm test
```

### Type Checking
```bash
npm run type-check
```

### Build for Production
```bash
npm run build
```

### Docker
```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

## 📚 Reference Architecture

This platform generates websites based on the architecture of the chess tournament website (`../Brief-Architect/`), which includes:
- Dynamic page generation
- Data integration (Google Sheets, external APIs)
- Responsive design with Tailwind CSS
- Shadcn/Radix UI components
- Express backend with caching
- PostgreSQL with Drizzle ORM

## 🔐 Security

- Password hashing with bcrypt
- Session management with express-session
- Environment variables for secrets
- Input validation with Zod
- Generated code is validated before deployment
- Rate limiting on API endpoints

## 📈 Deployment

### Azure Container Instances
```bash
# Build and push to ACR
npm run docker:build
docker tag agentic-platform:latest <registry>.azurecr.io/agentic-platform:latest
docker push <registry>.azurecr.io/agentic-platform:latest

# Deploy container
az container create --resource-group <rg> --name agentic-platform \
  --image <registry>.azurecr.io/agentic-platform:latest \
  --ports 5000 --environment-variables PORT=5000
```

## 📝 Database Schema

### Core Tables
- **users** - User accounts
- **organizations** - User organizations
- **projects** - Generated tournament websites
- **generation_jobs** - AI generation job tracking
- **generation_history** - Version history
- **custom_components** - Reusable components
- **generation_templates** - Preset templates

## 🎓 Learning Resources

- [Claude AI API Docs](https://anthropic.com/docs)
- [React Docs](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)

## 📄 License

MIT

## 🤝 Contributing

This is a private company project. Internal contributions welcome.

---

**Current Phase**: 1 - Foundation Setup
**Last Updated**: March 2026
