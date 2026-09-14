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

// Wrapper to handle auth errors
async function handleApiResponse(res: Response) {
  if (res.status === 401) {
    console.warn("[API] 401 Unauthorized - Clearing token and redirecting to login");
    localStorage.removeItem('authToken');
    window.dispatchEvent(new CustomEvent('api:unauthorized', { detail: { status: 401 } }));
  }
  return res;
}

export async function createProject(data: any) {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleApiResponse(res).then(r => r.json());
}

export async function getProject(id: string) {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleApiResponse(res).then(r => r.json());
}

export async function listProjects() {
  const res = await fetch(`${API_BASE}/api/projects`, {
    headers: getAuthHeaders(),
  });
  return handleApiResponse(res).then(r => r.json());
}

export async function startGeneration(projectId: string) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/generate`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleApiResponse(res).then(r => r.json());
}

export async function getGenerationStatus(projectId: string) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/generation-status`, {
    headers: getAuthHeaders(),
  });
  return handleApiResponse(res).then(r => r.json());
}

export async function getCodeInfo(projectId: string) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/code-info`, {
    headers: getAuthHeaders(),
  });
  return handleApiResponse(res).then(r => r.json());
}

export async function downloadCode(projectId: string) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/code`, {
    headers: getAuthHeaders(),
  });
  return handleApiResponse(res);
}

export function getSiteUrl(projectId: string) {
  return `${API_BASE}/sites/${projectId}`;
}

export async function getSiteInfo(projectId: string) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/site`, {
    headers: getAuthHeaders(),
  });
  return handleApiResponse(res).then(r => r.json());
}

export async function deployToPlatform(projectId: string) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/deploy-platform`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleApiResponse(res).then(r => r.json());
}

export async function deployToVercel(projectId: string, vercelToken?: string) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/deploy-vercel`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(vercelToken ? { vercelToken } : {}),
  });
  return handleApiResponse(res).then(r => r.json());
}
