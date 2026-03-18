import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject, startGeneration } from '../lib/api';

export default function ProjectForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tournamentName: '',
    date: '',
    location: '',
    description: '',
    pages: ['home', 'info', 'register'] as string[],
    colorScheme: 'modern' as string,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (!formData.tournamentName || !formData.date || !formData.location) {
        throw new Error('Please fill in all required fields');
      }

      // Create project
      console.log('Creating project with spec:', formData);
      const projectRes = await createProject({
        name: formData.tournamentName,
        description: formData.description,
        specification: formData,
      });

      if (!projectRes.project || !projectRes.project.id) {
        throw new Error(projectRes.error || 'Failed to create project');
      }

      const projectId = projectRes.project.id;
      console.log('Project created:', projectId);

      // Start generation
      console.log('Starting generation for project:', projectId);
      const genRes = await startGeneration(projectId);

      if (!genRes.jobId) {
        throw new Error(genRes.error || 'Failed to start generation');
      }

      console.log('Generation started:', genRes.jobId);

      // Navigate to generation progress page
      navigate(`/generate/${projectId}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      console.error('Error:', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
        <p className="text-gray-600">Describe your tournament website and let AI generate it for you</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tournament Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Tournament Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="tournamentName"
              value={formData.tournamentName}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              placeholder="e.g., Southeast Women's Chess Championship"
              required
            />
          </div>

          {/* Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tournament Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Location <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                placeholder="City, State"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              rows={4}
              placeholder="Describe your tournament, format, scoring system, special features..."
            />
          </div>

          {/* Pages */}
          <div>
            <label className="block text-sm font-medium mb-3">Pages to Include</label>
            <div className="space-y-2">
              {['home', 'info', 'register', 'schedule', 'players', 'results'].map((page) => (
                <label key={page} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.pages.includes(page)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData((prev) => ({
                          ...prev,
                          pages: [...prev.pages, page],
                        }));
                      } else {
                        setFormData((prev) => ({
                          ...prev,
                          pages: prev.pages.filter((p) => p !== page),
                        }));
                      }
                    }}
                    className="rounded mr-2"
                  />
                  <span className="capitalize">{page}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Color Scheme */}
          <div>
            <label className="block text-sm font-medium mb-2">Color Scheme</label>
            <select
              name="colorScheme"
              value={formData.colorScheme}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="modern">Modern (Blue/Purple)</option>
              <option value="classic">Classic (Gray/Navy)</option>
              <option value="vibrant">Vibrant (Multi-color)</option>
              <option value="minimal">Minimal (Black/White)</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating and Generating...
              </span>
            ) : (
              'Generate My Website →'
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl mb-2">🎯</div>
          <p className="font-medium mb-1">Quick Setup</p>
          <p>Fill in basic tournament details</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl mb-2">🤖</div>
          <p className="font-medium mb-1">AI Generates</p>
          <p>Agents create complete website code</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-2xl mb-2">📦</div>
          <p className="font-medium mb-1">Ready to Use</p>
          <p>Download or host your site instantly</p>
        </div>
      </div>
    </div>
  );
}
