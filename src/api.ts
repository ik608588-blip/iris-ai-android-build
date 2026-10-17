export const API_BASE_URL = "http://127.0.0.1:3001";

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
