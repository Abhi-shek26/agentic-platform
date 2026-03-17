// API client for backend communication
const API_BASE = process.env.VITE_API_URL || 'http://localhost:5000';

export async function createProject(data: any) {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getProject(id: string) {
  const res = await fetch(`${API_BASE}/api/projects/${id}`);
  return res.json();
}

export async function startGeneration(projectId: string) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/generate`, {
    method: 'POST',
  });
  return res.json();
}

export async function getGenerationStatus(projectId: string) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/generation-status`);
  return res.json();
}
