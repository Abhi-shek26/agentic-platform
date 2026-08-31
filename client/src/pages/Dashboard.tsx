import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listProjects, getCodeInfo, downloadCode } from '../lib/api';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'generating' | 'generated' | 'deployed' | 'failed';
  createdAt: string;
  specification?: any;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await listProjects();
        if (data.error) {
          setError(data.error);
          return;
        }
        setProjects(data.projects || []);
        setError(null);
      } catch (err) {
        setError(`Failed to fetch projects: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleDownload = async (projectId: string, projectName: string) => {
    try {
      setDownloadingId(projectId);
      const res = await downloadCode(projectId);

      if (!res.ok) {
        alert(`Download failed: ${res.statusText}`);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Download error: ${err}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = async (projectId: string) => {
    try {
      const data = await getCodeInfo(projectId);
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }

      // Open code preview in new window
      const preview = window.open('', '_blank');
      if (preview) {
        preview.document.write(`
          <html>
          <head>
            <title>Project Code Preview</title>
            <style>
              body { font-family: monospace; margin: 20px; background: #f5f5f5; }
              h2 { color: #333; }
              .file { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
              .stats { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>Code Preview</h1>
            <div class="stats">
              <h2>Project Stats</h2>
              <p><strong>Total Files:</strong> ${data.totalFiles || 0}</p>
              <p><strong>Total Lines:</strong> ${data.totalLines || 0}</p>
              <p><strong>Languages:</strong> ${data.languages?.join(', ') || 'N/A'}</p>
            </div>
            <div class="file">
              <h2>Files Generated:</h2>
              <pre>${JSON.stringify(data.files || [], null, 2)}</pre>
            </div>
          </body>
          </html>
        `);
      }
    } catch (err) {
      alert(`View error: ${err}`);
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await listProjects();
        if (data.error) {
          setError(data.error);
          return;
        }
        setProjects(data.projects || []);
        setError(null);
      } catch (err) {
        setError(`Failed to fetch projects: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      generating: 'bg-blue-100 text-blue-800',
      generated: 'bg-green-100 text-green-800',
      deployed: 'bg-purple-100 text-purple-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status] || colors.draft;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      draft: '📝',
      generating: '⏳',
      generated: '✓',
      deployed: '🚀',
      failed: '✕',
    };
    return icons[status] || '❓';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-red-800 mb-2">Error Loading Projects</h2>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Projects</h1>
        <Link
          to="/create"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-5xl mb-4">🎭</div>
          <p className="text-gray-600 mb-4 text-lg">You don't have any projects yet</p>
          <Link
            to="/create"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Create Your First Tournament Website
          </Link>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="font-bold text-lg mb-2">Describe</h3>
              <p className="text-sm text-gray-600">Tell us about your tournament and preferences</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="text-4xl mb-3">🤖</div>
              <h3 className="font-bold text-lg mb-2">Generate</h3>
              <p className="text-sm text-gray-600">AI agents create your complete website</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="text-4xl mb-3">🚀</div>
              <h3 className="font-bold text-lg mb-2">Deploy</h3>
              <p className="text-sm text-gray-600">Download or host your site instantly</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold flex-1 break-words">{project.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ml-2 ${getStatusColor(project.status)}`}>
                    {getStatusIcon(project.status)} {project.status}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>

                <div className="text-xs text-gray-500 mb-6">
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </div>

                <div className="flex space-x-2">
                  {project.status === 'draft' && (
                    <button
                      onClick={() => navigate(`/generate/${project.id}`)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      Generate
                    </button>
                  )}

                  {project.status === 'generating' && (
                    <Link
                      to={`/generate/${project.id}`}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm text-center"
                    >
                      Watch Progress
                    </Link>
                  )}

                  {project.status === 'generated' && (
                    <>
                      <button
                        onClick={() => handleDownload(project.id, project.name)}
                        disabled={downloadingId === project.id}
                        className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {downloadingId === project.id ? 'Downloading...' : 'Download'}
                      </button>
                      <button
                        onClick={() => handleView(project.id)}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                      >
                        View
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      if (confirm('Delete this project?')) {
                        // TODO: Implement delete
                      }
                    }}
                    className="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
