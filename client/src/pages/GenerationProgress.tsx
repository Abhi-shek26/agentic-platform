import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGenerationStatus } from '../lib/api';

interface Agent {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface GenerationStatus {
  percentage: number;
  currentAgent: string;
  message: string;
  agents: Agent[];
  status: 'processing' | 'completed' | 'failed';
  error?: string;
  projectPath?: string;
}

export default function GenerationProgress() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<GenerationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!projectId) return;

    let isMounted = true;
    let pollInterval: NodeJS.Timer;

    const poll = async () => {
      try {
        const data = await getGenerationStatus(projectId);

        if (!isMounted) return;

        if (data.error) {
          setError(data.error);
          return;
        }

        setProgress(data);
        setLoading(false);
        setError(null);

        // Add to logs
        if (data.message) {
          setLogs((prev) => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${data.message}`]);
        }

        // Stop polling if completed or failed
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollInterval);
        }
      } catch (err) {
        if (isMounted) {
          setError(`Failed to fetch status: ${err}`);
          setLoading(false);
        }
      }
    };

    // Poll immediately and then every 2 seconds
    poll();
    pollInterval = setInterval(poll, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [projectId]);

  if (loading && !progress) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Connecting to generation service...</p>
      </div>
    );
  }

  if (error && !progress) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">⚠️ Error</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const agents = progress?.agents || [];
  const percentage = progress?.percentage || 0;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Generating Your Website...</h1>
      <p className="text-gray-600 mb-6">{progress?.message}</p>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="font-medium">Overall Progress</span>
            <span className="font-bold text-blue-600">{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Agent Status */}
        <div>
          <h3 className="font-semibold text-lg mb-4">Generation Agents</h3>
          <div className="space-y-3">
            {agents.map((agent, idx) => (
              <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="relative">
                  {agent.status === 'completed' && (
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                      ✓
                    </div>
                  )}
                  {agent.status === 'processing' && (
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white animate-pulse">
                      ⟳
                    </div>
                  )}
                  {agent.status === 'failed' && (
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm">
                      ✕
                    </div>
                  )}
                  {agent.status === 'pending' && (
                    <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  )}
                </div>
                <span className="flex-1 font-medium">{agent.name}</span>
                <span className="text-sm text-gray-500 capitalize">{agent.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Logs */}
        <div>
          <h3 className="font-semibold text-lg mb-2">Activity Log</h3>
          <div className="bg-gray-900 text-green-500 rounded p-4 text-sm font-mono max-h-48 overflow-y-auto border border-gray-700">
            {logs.length > 0 ? (
              logs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap break-words">
                  {log}
                </div>
              ))
            ) : (
              <p className="text-gray-500">Waiting for updates...</p>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {progress?.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-bold text-green-800 mb-2">✓ Generation Complete!</h3>
            <p className="text-green-700 mb-4">Your tournament website has been generated successfully.</p>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/')}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                View Projects
              </button>
              {progress.projectPath && (
                <a
                  href={`http://localhost:5000/api/projects/${projectId}/code`}
                  download
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Download Code
                </a>
              )}
            </div>
          </div>
        )}

        {progress?.status === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-bold text-red-800 mb-2">✕ Generation Failed</h3>
            <p className="text-red-700 mb-4">{progress.error || 'An error occurred during generation'}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Back to Projects
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
