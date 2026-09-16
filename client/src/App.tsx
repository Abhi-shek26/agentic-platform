import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProjectForm from "./pages/ProjectForm";
import GenerationProgress from "./pages/GenerationProgress";
import "./App.css";

function App() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    if (token) {
      // Verify token is valid by making a test request
      fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(res => {
          if (res.ok) {
            setAuthToken(token);
          } else if (res.status === 401) {
            // Token is invalid, clear it
            localStorage.removeItem('authToken');
            setAuthToken(null);
          }
        })
        .catch(err => {
          console.error("Token verification failed:", err);
          localStorage.removeItem('authToken');
          setAuthToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
  };

  // Setup global error handler for 401 responses
  useEffect(() => {
    const handleUnauthorized = (event: Event) => {
      const detail = (event as any).detail;
      if (detail?.status === 401) {
        console.log("[AUTH] Received 401 - Redirecting to login");
        localStorage.removeItem('authToken');
        setAuthToken(null);
      }
    };

    window.addEventListener('api:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('api:unauthorized', handleUnauthorized);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Show login page if not authenticated
  if (!authToken) {
    return <Login onSuccess={setAuthToken} />;
  }

  // Show app if authenticated
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600">
              🎭 Agentic Tournament Generator
            </Link>
            <div className="space-x-4 flex items-center">
              <Link
                to="/"
                className="text-gray-700 hover:text-blue-600"
              >
                Dashboard
              </Link>
              <Link
                to="/create"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Create Project
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        {/* Routes */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<ProjectForm />} />
            <Route path="/generate/:projectId" element={<GenerationProgress />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white text-center py-4 mt-12">
          <p>
            &copy; 2026 Agentic Tournament Generator | Powered by Claude AI
          </p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
