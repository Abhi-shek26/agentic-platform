/**
 * Mock Agents for Testing
 * Returns realistic generated code without API calls
 * Useful for testing queue, progress tracking, and UI
 * Switch to real Claude by deleting this and using real agents
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

interface RegistrationFormProps {
  onSubmit: (data: { email: string; rating: number }) => Promise<void>;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSubmit }) => {
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSubmit({ email, rating });
      setEmail('');
      setRating(1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Rating</label>
        <input
          type="number"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
};`,
        },
        {
          name: "Hero",
          path: "src/components/Hero.tsx",
          code: `import React from 'react';

export const Hero: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-4">Chess Tournament 2026</h1>
        <p className="text-xl mb-8">Join competitors from around the world in our spring championship</p>
        <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100">
          Register Now
        </button>
      </div>
    </div>
  );
};`,
        },
        {
          name: "Participants",
          path: "src/components/Participants.tsx",
          code: `import React, { useState, useEffect } from 'react';

interface Participant {
  id: string;
  email: string;
  rating: number;
}

export const Participants: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', email: 'alice@chess.com', rating: 2100 },
    { id: '2', email: 'bob@chess.com', rating: 1950 },
    { id: '3', email: 'charlie@chess.com', rating: 1850 },
  ]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Registered Participants</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Rating</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{p.email}</td>
                <td className="p-3">{p.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};`,
        },
        {
          name: "Schedule",
          path: "src/components/Schedule.tsx",
          code: `import React from 'react';

interface Round {
  roundNumber: number;
  date: string;
  startTime: string;
  description: string;
}

export const Schedule: React.FC = () => {
  const rounds: Round[] = [
    { roundNumber: 1, date: '2026-04-15', startTime: '10:00 AM', description: 'Opening Round' },
    { roundNumber: 2, date: '2026-04-16', startTime: '10:00 AM', description: 'Round 2' },
    { roundNumber: 3, date: '2026-04-17', startTime: '10:00 AM', description: 'Round 3' },
    { roundNumber: 4, date: '2026-04-18', startTime: '10:00 AM', description: 'Semifinals' },
    { roundNumber: 5, date: '2026-04-19', startTime: '2:00 PM', description: 'Finals' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Tournament Schedule</h2>
      <div className="space-y-4">
        {rounds.map((round) => (
          <div key={round.roundNumber} className="flex items-center p-4 border rounded-lg hover:bg-gray-50">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
              {round.roundNumber}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{round.description}</h3>
              <p className="text-gray-600 text-sm">{round.date} at {round.startTime}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};`,
        },
      ],
      pages: [
        {
          name: "Home",
          path: "src/pages/home.tsx",
          code: `import React from 'react';
import { Hero } from '../components/Hero';
import { TournamentCard } from '../components/TournamentCard';

export const Home: React.FC = () => {
  const tournaments = [
    { id: 1, name: 'Spring Chess Championship', date: '2026-04-15', participants: 32 },
    { id: 2, name: 'Summer Blitz Series', date: '2026-06-20', participants: 24 },
    { id: 3, name: 'Fall Classic', date: '2026-09-10', participants: 40 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Hero />
      <div className="max-w-6xl mx-auto py-12 px-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Upcoming Tournaments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} name={t.name} date={t.date} participants={t.participants} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;`,
        },
        {
          name: "Register",
          path: "src/pages/register.tsx",
          code: `import React from 'react';
import { RegistrationForm } from '../components/RegistrationForm';

export const Register: React.FC = () => {
  const handleRegistration = async (data: { email: string; rating: number }) => {
    // In a real app, this would call your backend API
    console.log('Registering participant:', data);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Tournament Registration</h1>
        <RegistrationForm onSubmit={handleRegistration} />
      </div>
    </div>
  );
};

export default Register;`,
        },
        {
          name: "Schedule",
          path: "src/pages/schedule.tsx",
          code: `import React from 'react';
import { Schedule } from '../components/Schedule';

export const SchedulePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Schedule />
      </div>
    </div>
  );
};

export default SchedulePage;`,
        },
        {
          name: "Participants",
          path: "src/pages/participants.tsx",
          code: `import React from 'react';
import { Participants } from '../components/Participants';

export const ParticipantsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Participants />
      </div>
    </div>
  );
};

export default ParticipantsPage;`,
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
    const tournaments = [
      {
        id: '1',
        name: 'Spring Chess Championship 2026',
        date: '2026-04-15',
        location: 'New York, USA',
        participants: 32,
        rounds: 5,
      },
    ];
    res.json({ tournaments });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});`,
        },
        {
          path: "/api/tournament/:id",
          method: "GET",
          code: `router.get('/api/tournament/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tournament = {
      id,
      name: 'Spring Chess Championship 2026',
      date: '2026-04-15',
      location: 'New York, USA',
      description: 'A competitive regional chess tournament',
      participants: 32,
      rounds: 5,
    };
    res.json({ tournament });
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});`,
        },
        {
          path: "/api/participants",
          method: "GET",
          code: `router.get('/api/participants', async (req, res) => {
  try {
    const participants = [
      { id: '1', email: 'alice@chess.com', rating: 2100, tournament_id: '1' },
      { id: '2', email: 'bob@chess.com', rating: 1950, tournament_id: '1' },
      { id: '3', email: 'charlie@chess.com', rating: 1850, tournament_id: '1' },
    ];
    res.json({ participants, count: participants.length });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});`,
        },
        {
          path: "/api/register",
          method: "POST",
          code: `router.post('/api/register', async (req, res) => {
  try {
    const { email, rating } = req.body;
    if (!email || rating === undefined) {
      return res.status(400).json({ error: 'Email and rating are required' });
    }
    if (!email.match(/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (rating < 0 || rating > 3000) {
      return res.status(400).json({ error: 'Rating must be between 0 and 3000' });
    }
    const participant = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      rating,
      tournament_id: '1',
      registered_at: new Date().toISOString(),
    };
    res.status(201).json({ participant, message: 'Successfully registered' });
  } catch (error) {
    console.error('Error registering participant:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});`,
        },
        {
          path: "/api/schedule",
          method: "GET",
          code: `router.get('/api/schedule', async (req, res) => {
  try {
    const schedule = [
      { round: 1, date: '2026-04-15', startTime: '10:00 AM', description: 'Opening Round' },
      { round: 2, date: '2026-04-16', startTime: '10:00 AM', description: 'Round 2' },
      { round: 3, date: '2026-04-17', startTime: '10:00 AM', description: 'Round 3' },
      { round: 4, date: '2026-04-18', startTime: '10:00 AM', description: 'Semifinals' },
      { round: 5, date: '2026-04-19', startTime: '2:00 PM', description: 'Finals' },
    ];
    res.json({ schedule });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});`,
        },
      ],
      utilities: [
        {
          name: "validation",
          code: `export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
};

export const validateRating = (rating: number): boolean => {
  return rating >= 0 && rating <= 3000;
};`,
        },
        {
          name: "formatters",
          code: `export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatTime = (time: string): string => {
  return time; // Time is already formatted like "10:00 AM"
};`,
        },
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

export function createMockIntegrationResponse() {
  return {
    success: true,
    data: {
      integrations: [
        {
          name: "google-sheets",
          status: "configured",
          envVars: ["GOOGLE_SHEETS_ID", "GOOGLE_SERVICE_ACCOUNT_KEY"],
        },
      ],
      steps: [
        "Create a Google Cloud service account",
        "Share the target sheet with the service account email",
        "Add credentials to environment variables",
      ],
    },
  };
}

export function createMockConfigResponse() {
  return {
    success: true,
    data: {
      files: [
        {
          path: "package.json",
          description: "Project scripts and dependencies",
        },
        {
          path: "tsconfig.json",
          description: "TypeScript compiler options",
        },
        {
          path: "vite.config.ts",
          description: "Frontend build and dev server configuration",
        },
      ],
      notes: ["Enable strict mode for better type safety"],
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
