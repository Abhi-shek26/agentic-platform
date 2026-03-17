# 🚀 Quick Start Guide - Agentic Platform

## Prerequisites

- **Node.js** 18+ (with npm)
- **PostgreSQL** 14+
- **Redis** 6+ (optional for local dev)
- **Anthropic API Key** (for Claude AI)

---

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

Edit `.env` and add:
- `DATABASE_URL` - Your PostgreSQL connection
- `ANTHROPIC_API_KEY` - Claude API key from https://console.anthropic.com
- `SESSION_SECRET` - A secure random string

**Note:** See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed PostgreSQL setup instructions.

### 3. Database Setup

```bash
# Generate migrations from schema
npm run db:generate

# Apply migrations
npm run db:push

# Optional: Open Drizzle Studio (web UI)
npm run db:studio
```

### 4. Start Development Server

```bash
npm run dev
```

This runs:
- **Frontend**: http://localhost:5173 (React SPA)
- **Backend API**: http://localhost:5000 (Express)

---

## Development Commands

```bash
# Type checking
npm run type-check

# Build for production
npm run build

# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run

# Linting
npm run lint

# Database commands
npm run db:push      # Apply migrations
npm run db:generate  # Generate migrations from schema
npm run db:studio    # Open Drizzle Studio
```

---

## API Testing

### SignUp

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "SecurePass123",
    "displayName": "Test User"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

### Get Current User

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Cookie: connect.sid=<session-cookie>"
```

### Create Project

```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<session-cookie>" \
  -d '{
    "name": "My Chess Tournament",
    "slug": "my-chess-tournament",
    "description": "Tournament website",
    "specification": {
      "tournamentName": "Regional Chess Championship",
      "tournamentDate": "2026-05-15",
      "location": "Boston, MA",
      "pages": ["home", "info", "register"]
    }
  }'
```

---

## Project Structure

```
server/              # Express backend
├── ai/              # AI orchestration & agents
├── codegen/         # Code generation engine
├── deployment/      # Deployment & hosting
├── routes.ts        # API routes
├── index.ts         # Server entry point
└── utils/           # Utilities (auth, errors, etc)

client/              # React frontend
├── src/
│   ├── pages/       # Page components
│   ├── lib/         # API client & utilities
│   └── App.tsx      # Main app component

shared/              # Shared types & schema
├── schema.ts        # Database schema
├── types.ts         # TypeScript types
└── constants.ts     # Constants
```

---

## Troubleshooting

### "Cannot find module '@shared/types'"

Make sure TypeScript paths are configured in `tsconfig.json` and Vite config.

### Database connection fails

1. Check PostgreSQL is running
2. Verify DATABASE_URL in .env
3. See DATABASE_SETUP.md for setup instructions

### "API key not found" error

Set `ANTHROPIC_API_KEY` in `.env`. Get key from https://console.anthropic.com

### Port 5000 already in use

Either:
- Change PORT in .env
- Kill process using port 5000

```bash
# macOS/Linux
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## Phase 1 Checklist

- [x] Project structure created
- [x] Dependencies installed
- [x] Authentication implemented
- [x] API routes created
- [x] Error handling set up
- [ ] PostgreSQL database configured
- [ ] Migrations run
- [ ] Redis queue set up
- [ ] API endpoints tested
- [ ] Deployed to Azure

---

## Next Steps

1. **Set up PostgreSQL** (see DATABASE_SETUP.md)
2. **Test API endpoints** (use curl examples above)
3. **Implement Redis queue** for long-running generation jobs
4. **Build first React page** for tournament specification form
5. **Test AI orchestrator** with sample tournament spec
6. **Deploy to Azure** Container Instances

---

## Support & Documentation

- [Anthropic Claude API Docs](https://docs.anthropic.com)
- [Express.js Documentation](https://expressjs.com)
- [React Documentation](https://react.dev)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [PostgreSQL Docs](https://www.postgresql.org/docs)

---

**Need help?** Check the main [README.md](./README.md) or DATABASE_SETUP.md
