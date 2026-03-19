// API client for backend communication
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function createProject(data: any) {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getProject(id: string) {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function listProjects() {
  const res = await fetch(`${API_BASE}/api/projects`, {
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function startGeneration(projectId: string) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/generate`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function getGenerationStatus(projectId: string) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/generation-status`, {
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function getCodeInfo(projectId: string) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/code-info`, {
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function downloadCode(projectId: string) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/code`, {
    headers: getAuthHeaders(),
  });
  return res;
}
