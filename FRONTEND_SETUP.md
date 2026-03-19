# Frontend Setup Guide

## Problem: Frontend Not Showing

Your frontend is a **separate React/Vite application** that needs to be started independently (or via our new combined script).

---

## Solution: 3 Ways to Run

### ✅ Best Way: Combined Dev Server (NEW)

**Start everything with ONE command:**

```bash
npm run dev:full
```

This starts:
- ✅ Backend on http://localhost:5000
- ✅ Frontend on http://localhost:5173

Then open: **http://localhost:5173** in your browser

---

### Way 2: Two Terminal Windows

**Terminal 1 - Backend:**
```bash
npm run dev
# Backend running on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
npm run dev:client
# Frontend running on http://localhost:5173
```

Then open: **http://localhost:5173** in your browser

---

### Way 3: Docker (Production)

Docker automatically builds and serves the frontend:

```bash
# Build frontend during Docker build
docker build -f docker/Dockerfile -t agentic-platform:latest .

# Run with docker-compose
docker-compose up
```

Access at: **http://localhost:5000** (frontend served from backend)

---

## How It Works

### Development Mode
- **Backend** (Express server) runs on port 5000
  - Serves API endpoints: `/api/*`
  - Proxies unknown routes to frontend

- **Frontend** (Vite dev server) runs on port 5173
  - Runs React app with hot module reloading
  - Has built-in proxy config that forwards `/api/*` to backend

### Production Mode (Docker/Deployment)
- **Frontend** is pre-built and baked into the backend
- Backend serves the built frontend as static files
- Single endpoint: http://localhost:5000

---

## Common Issues

### "Connection refused" on localhost:5173
```
✗ Frontend not running
→ Run: npm run dev:client
```

### "Cannot GET /" on localhost:5173
```
✗ Vite not serving frontend
→ Check you're running: npm run dev:client (not npm run dev)
```

### "API not found" error in frontend
```
✗ Backend not running
→ Run: npm run dev (in another terminal)
```

### Using docker-compose but frontend doesn't show
```
✗ Frontend needs to be built first
→ Run: npm run build:client
→ Then: docker-compose up
```

---

## What's in the Frontend

```
client/
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx        # Project list
│   │   ├── ProjectForm.tsx      # Create project
│   │   ├── GenerationProgress.tsx # Watch generation
│   │   └── ...
│   ├── components/
│   │   ├── Button.tsx           # UI components
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── ...
│   ├── lib/
│   │   └── api.ts              # API client
│   ├── App.tsx                 # Main app
│   └── main.tsx                # Entry point
├── index.html                  # HTML template
└── public/                     # Static assets
```

---

## Frontend Features

- ✅ User signup/login
- ✅ Create tournament projects
- ✅ Watch code generation in real-time
- ✅ Download generated websites
- ✅ Responsive design (works on mobile)
- ✅ Light/dark theme (if configured)

---

## Building for Production

```bash
# Build frontend
npm run build:client
# Output: client/dist/ folder

# In Docker, this is automatic
docker build -f docker/Dockerfile -t agentic-platform:latest .
```

---

## Testing Frontend

```bash
# Run E2E tests (includes frontend testing)
npm run test:e2e

# Run with specific backend URL
VITE_API_URL=http://localhost:5000 npm run dev:client
```

---

## Development Workflow

1. **Start both servers:**
   ```bash
   npm run dev:full
   ```

2. **Edit files** in `client/src/` or `server/`
   - Frontend changes hot-reload instantly
   - Backend changes may need manual restart

3. **Frontend files to edit:**
   - Pages: `client/src/pages/`
   - Components: `client/src/components/`
   - Styles: Tailwind CSS in JSX files
   - API calls: `client/src/lib/api.ts`

4. **Backend files to edit:**
   - Routes: `server/routes.ts`
   - Logic: `server/utils/`
   - Generators: `server/codegen/`

---

## Quick Commands

```bash
npm run dev:full          # Start both servers
npm run dev              # Backend only
npm run dev:client       # Frontend only
npm run build:client     # Build frontend for production
npm run test:e2e         # Run all tests
docker-compose up        # Deploy locally with Docker
```

---

## Next Steps

1. **Run the frontend now:**
   ```bash
   npm run dev:full
   ```

2. **Open in browser:**
   ```
   http://localhost:5173
   ```

3. **Start using it:**
   - Sign up with email
   - Create a tournament
   - Watch code generate
   - Download the website!

---

**You're all set!** Frontend should now be visible and working. 🎉
