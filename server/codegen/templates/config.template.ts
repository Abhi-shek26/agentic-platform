/**
 * Configuration File Templates
 * Standard project configuration files
 */

export const packageJsonTemplate = (projectData: any): Record<string, any> => {
  const { name, description, version = '1.0.0' } = projectData;

  return {
    name: name.toLowerCase().replace(/\s+/g, '-'),
    version,
    description,
    type: 'module',
    scripts: {
      dev: 'concurrently "vite" "tsx watch server/index.ts"',
      build: 'vite build && tsc --noEmit',
      preview: 'vite preview',
      start: 'node --loader tsx/esm server/index.ts',
      'db:push': 'drizzle-kit push:pg',
      'db:studio': 'drizzle-kit studio',
      lint: 'eslint . --ext .ts,.tsx',
      typecheck: 'tsc --noEmit'
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      express: '^4.18.2',
      'drizzle-orm': '^0.30.0',
      'pg': '^8.11.0',
      clsx: '^2.0.0',
      'lucide-react': '^0.292.0'
    },
    devDependencies: {
      '@types/express': '^4.17.21',
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0',
      '@types/node': '^20.0.0',
      typescript: '^5.3.0',
      vite: '^5.0.0',
      '@vitejs/plugin-react': '^4.2.0',
      'drizzle-kit': '^0.20.0',
      tsx: '^4.7.0',
      concurrently: '^8.2.0',
      tailwindcss: '^3.3.0',
      autoprefixer: '^10.4.16',
      postcss: '^8.4.31',
      eslint: '^8.54.0'
    }
  };
};

export const tsConfigTemplate = (): Record<string, any> => ({
  compilerOptions: {
    target: 'ES2020',
    useDefineForClassFields: true,
    lib: ['ES2020', 'DOM', 'DOM.Iterable'],
    module: 'ESNext',
    skipLibCheck: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: true,
    resolveJsonModule: true,
    isolatedModules: true,
    sourceMap: true,
    noEmit: true,
    jsx: 'react-jsx',
    baseUrl: '.',
    paths: {
      '@/*': ['./client/src/*'],
      '@server/*': ['./server/*'],
      '@shared/*': ['./shared/*']
    }
  },
  references: [{ path: './tsconfig.app.json' }]
});

export const viteConfigTemplate = (): string => `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    target: 'ES2020'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@server': path.resolve(__dirname, './server'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
`;

export const tailwindConfigTemplate = (): string => `import type { Config } from 'tailwindcss';

export default {
  content: [
    './client/index.html',
    './client/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#1e40af',
      },
    },
  },
  plugins: [],
} satisfies Config;
`;

export const dockerfileTemplate = (): string => `FROM node:20-alpine

WORKDIR /app

# Copy generated project files
COPY package*.json ./
RUN npm ci --only=production

# Build frontend and backend
COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
`;

export const envExampleTemplate = (projectData?: any): string => `# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tournament_db

# Server
PORT=5000
NODE_ENV=production

# API
API_URL=http://localhost:5000

# External APIs (if needed)
# GOOGLE_SHEETS_API_KEY=
# CHESS_API_KEY=

# Session
SESSION_SECRET=your-session-secret-here
`;

export const gitignoreTemplate = (): string => `# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Production
/dist
/build

# Misc
.DS_Store
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# Generated
/generated-projects
`;
