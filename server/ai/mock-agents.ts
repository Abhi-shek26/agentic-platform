/**
 * Mock Agents for Testing
 * Returns realistic generated code without API calls
 * Useful for testing queue, progress tracking, and UI
 * Switch to real Gemini by deleting this and using real agents
 */

export function createMockSpecParserResponse() {
  return {
    success: true,
    data: {
      validatedSpec: {
        tournamentName: "Spring Chess Championship 2026",
        date: "2026-04-15",
        location: "New York, USA",
        description: "A competitive regional chess tournament",
        pages: ["home", "info", "register", "schedule", "players"],
        colorScheme: "modern",
        integrations: ["google-sheets"],
        numberOfParticipants: 32,
        rounds: 5,
      },
      errors: [],
      warnings: [],
    },
  };
}

export function createMockArchitectResponse() {
  return {
    success: true,
    data: {
      folderStructure: {
        client: ["src/pages", "src/components", "src/hooks", "src/lib"],
        server: [
          "routes",
          "middleware",
          "controllers",
          "utils",
          "services",
        ],
        shared: ["types", "constants", "schemas"],
      },
      pages: [
        {
          name: "Home",
          path: "/",
          components: ["Hero", "Features", "CTA"],
          apiDependencies: [],
        },
        {
          name: "Tournament Info",
          path: "/info",
          components: ["TournamentOverview", "Participants", "Schedule"],
          apiDependencies: ["/api/tournament"],
        },
        {
          name: "Register",
          path: "/register",
          components: ["RegistrationForm", "PaymentProcessor"],
          apiDependencies: ["/api/register", "/api/payment"],
        },
      ],
      tables: [
        {
          name: "tournaments",
          fields: [
            { name: "id", type: "uuid" },
            { name: "name", type: "string" },
            { name: "date", type: "date" },
            { name: "location", type: "string" },
          ],
        },
        {
          name: "participants",
          fields: [
            { name: "id", type: "uuid" },
            { name: "tournament_id", type: "uuid" },
            { name: "email", type: "string" },
            { name: "rating", type: "integer" },
          ],
        },
      ],
      apiEndpoints: [
        { method: "GET", path: "/api/tournament", description: "Get tournament data" },
        { method: "GET", path: "/api/participants", description: "List all participants" },
        { method: "POST", path: "/api/register", description: "Register a participant" },
      ],
    },
  };
}

export function createMockFrontendResponse() {
  return {
    success: true,
    data: {
      components: [
        {
          name: "TournamentCard",
          path: "src/components/TournamentCard.tsx",
          code: `import React from 'react';

interface TournamentCardProps {
  name: string;
  date: string;
  participants: number;
  onClick?: () => void;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({
  name,
  date,
  participants,
  onClick,
}) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <h3 className="text-xl font-bold text-gray-900">{name}</h3>
      <p className="text-gray-600 mt-2">{date}</p>
      <p className="text-sm text-gray-500 mt-2">{participants} Participants</p>
    </div>
  );
};`,
        },
        {
          name: "RegistrationForm",
          path: "src/components/RegistrationForm.tsx",
          code: `import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

interface RegistrationFormProps {
  onSubmit: (data: any) => Promise<void>;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSubmit }) => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);

  const onFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input {...register('email', { required: true })} type="email" className="w-full px-3 py-2 border rounded-md" />
        {errors.email && <span className="text-red-500 text-sm">Email is required</span>}
      </div>
      <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
};`,
        },
      ],
      pages: [
        {
          name: "Home",
          path: "src/pages/Home.tsx",
          code: `import React from 'react';
import { TournamentCard } from '../components/TournamentCard';

export const Home: React.FC = () => {
  const tournaments = [
    { id: 1, name: 'Spring Chess Championship', date: '2026-04-15', participants: 32 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Tournaments</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} {...t} />
          ))}
        </div>
      </div>
    </div>
  );
};`,
        },
      ],
      styles: "module.exports = { theme: { extend: { colors: { primary: '#3b82f6', secondary: '#1e40af' } } } }",
    },
  };
}

export function createMockBackendResponse() {
  return {
    success: true,
    data: {
      routes: [
        {
          path: "/api/tournament",
          method: "GET",
          code: `router.get('/api/tournament', async (req, res) => {
  try {
    const tournament = await storage.getTournament('tournament-1');
    res.json({ tournament });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});`,
        },
        {
          path: "/api/register",
          method: "POST",
          code: `router.post('/api/register', requireAuth, async (req, res) => {
  try {
    const { email, rating } = req.body;
    if (!email || !rating) {
      return res.status(400).json({ error: 'Email and rating required' });
    }
    const participant = await storage.createParticipant({ email, rating });
    res.status(201).json({ participant });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});`,
        },
      ],
      middleware: [
        {
          name: "validateTournamentInput",
          code: `const validateTournamentInput = (req, res, next) => {
  const { name, date, location } = req.body;
  if (!name || !date || !location) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  next();
};`,
        },
      ],
      utilities: [
        {
          name: "calculateRatings",
          code: `export function calculateRatings(participants: any[]) {
  return participants.sort((a, b) => (b.rating || 0) - (a.rating || 0));
}`,
        },
      ],
    },
  };
}

export function createMockDatabaseResponse() {
  return {
    success: true,
    data: {
      schema: `import { pgTable, uuid, varchar, date, integer, text } from 'drizzle-orm/pg-core';

export const tournaments = pgTable('tournaments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  date: date('date').notNull(),
  location: varchar('location', { length: 255 }).notNull(),
  description: text('description'),
});

export const participants = pgTable('participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournament_id: uuid('tournament_id').notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  rating: integer('rating'),
});`,
      migrations: ["001_create_tournaments.sql", "002_create_participants.sql"],
    },
  };
}

export function createMockQAResponse() {
  return {
    success: true,
    data: {
      validationReport: [],
      suggestions: [
        "Consider adding error boundaries for React components",
        "Add loading states to all async operations",
      ],
      overallQuality: "excellent",
    },
  };
}
