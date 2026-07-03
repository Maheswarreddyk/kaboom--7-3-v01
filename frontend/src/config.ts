// Centralized Frontend Configuration Layer
// No component or service should access import.meta.env directly.

function requireEnv(key: string, value: string | undefined): string {
  if (value) return value;
  if (import.meta.env.DEV) {
    console.warn(`[config] Missing ${key} — set it in .env.local for local development.`);
  }
  return '';
}

export const config = {
  supabaseUrl: requireEnv('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL as string),
  supabaseKey: requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string),
  apiUrl: (import.meta.env.VITE_API_URL as string) || '',
  signalingProvider: (import.meta.env.VITE_SIGNALING_PROVIDER as 'supabase' | 'socketio') || 'supabase',
  socketUrl: (import.meta.env.VITE_SOCKET_URL as string) || '',
  environment: (import.meta.env.VITE_APP_ENV as string) || import.meta.env.MODE || 'development',
  isProduction: import.meta.env.PROD,
};

export function getApiBaseUrl(): string {
  return config.apiUrl || (typeof window !== 'undefined' ? window.location.origin : '');
}

export function getSocketUrl(): string {
  return config.socketUrl || getApiBaseUrl();
}
