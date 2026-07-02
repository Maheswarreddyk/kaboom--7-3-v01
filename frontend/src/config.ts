// Centralized Frontend Configuration Layer
// No component or service should access import.meta.env directly.

export const config = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string) || 'https://dirocenpssdilkztizps.supabase.co',
  supabaseKey: (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpcm9jZW5wc3NkaWxrenRpenBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTY1MzUsImV4cCI6MjA5ODMzMjUzNX0.P1NX8cfS4rTafIINUONBrWH3wI4DaUYrQJJUCJXvU9Y',
  apiUrl: (import.meta.env.VITE_API_URL as string) || '',
  signalingProvider: (import.meta.env.VITE_SIGNALING_PROVIDER as 'supabase' | 'socketio') || 'supabase',
};
