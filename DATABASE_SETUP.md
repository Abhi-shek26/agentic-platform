# PostgreSQL Setup Guide for Agentic Platform

## Prerequisites

### Windows (Recommended for your setup)

1. **Download PostgreSQL Installer**
   - Download from: https://www.postgresql.org/download/windows/
   - Version 15+ recommended

2. **Install PostgreSQL**
   - Run installer
   - Choose installation directory (e.g., `C:\Program Files\PostgreSQL\15`)
   - Set password for `postgres` user (remember this!)
   - Keep port as 5432 (default)
   - Check "Add PostgreSQL to system PATH"

3. **Verify Installation**
   ```bash
   psql --version
   ```

### macOS

```bash
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

---

## Database Setup Steps

### 1. Create Database

After PostgreSQL is installed and running:

```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql shell:
CREATE DATABASE agentic_platform_dev;
CREATE USER agentic WITH PASSWORD 'agentic123';
ALTER ROLE agentic SET client_encoding TO 'utf8';
ALTER ROLE agentic SET default_transaction_isolation TO 'read committed';
ALTER ROLE agentic SET default_transaction_deferrable TO on;
ALTER ROLE agentic SET default_time_zone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE agentic_platform_dev TO agentic;
\q
```

### 2. Verify Connection

```bash
psql -U agentic -d agentic_platform_dev -h localhost
```

### 3. Update .env File

Edit `.env` and update DATABASE_URL:

```
DATABASE_URL=postgresql://agentic:agentic123@localhost:5432/agentic_platform_dev
```

### 4. Run Migrations

```bash
npm run db:push
```

This will:
- Generate migrations from schema
- Apply all migrations
- Create all tables

### 5. Verify Tables Created

```bash
npm run db:studio
```

This opens Drizzle Studio (web UI) to view your database.

---

## Redis Setup (Optional for local dev)

For development, Redis is optional. For production deployment, install:

### Windows (using WSL2 or Docker)

```bash
docker run -d -p 6379:6379 redis:latest
```

### macOS

```bash
brew install redis
brew services start redis
```

### Linux

```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
```

---

## Troubleshooting

### Connection refused error
- Verify PostgreSQL is running: `psql -U postgres`
- Check DATABASE_URL in .env

### "role agentic does not exist"
- Created user not properly created
- Run the CREATE USER command again in psql

### Port 5432 already in use
- Change port in `.env`: `postgresql://...:5432` → `postgresql://...:5433`
- Make sure PostgreSQL is running on that port

---

## Next: Application Startup

Once PostgreSQL is set up and running:

```bash
npm run dev
```

This starts:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
