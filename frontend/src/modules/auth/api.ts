import { authFetch, clearToken, getToken, setToken } from '@/lib/apiClient';
import type { User } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export async function signup(email: string, password: string, name?: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create account');
  }
  const data: TokenResponse = await response.json();
  setToken(data.access_token);
  return data.user;
}

export async function login(email: string, password: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to log in');
  }
  const data: TokenResponse = await response.json();
  setToken(data.access_token);
  return data.user;
}

export function logout(): void {
  clearToken();
}

export async function fetchCurrentUser(): Promise<User | null> {
  if (!getToken()) return null;
  const response = await authFetch(`${API_BASE_URL}/api/v1/auth/me`);
  if (!response.ok) return null;
  return await response.json();
}
