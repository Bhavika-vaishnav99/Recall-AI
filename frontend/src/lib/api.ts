const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface HealthResponse {
  status: string;
  app: string;
  environment: string;
  timestamp: string;
  database: {
    status: string;
    database?: string;
    details?: string;
  };
}

export async function fetchBackendHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Backend health check error:', error);
    return null;
  }
}
