import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ProjectForm from "./pages/ProjectForm";
import GenerationProgress from "./pages/GenerationProgress";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600">
              🎭 Agentic Tournament Generator
            </Link>
            <div className="space-x-4">
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
