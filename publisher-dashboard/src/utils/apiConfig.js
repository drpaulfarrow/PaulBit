// Shared API URL configuration utility
// Works for both local dev (localhost:5173) and production (Docker/Azure)

export const getApiBase = (envVar, defaultPort) => {
  // If explicitly set via env var, use it
  if (import.meta.env[envVar]) return import.meta.env[envVar];
  
  // Check if running on localhost:5173 (dev server) - use absolute URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // Local dev server (Vite on port 5173)
    if (hostname === 'localhost' && port === '5173') {
      return `http://localhost:${defaultPort}`;
    }
    
    // Production/Docker - use relative URLs (empty string) which will go through nginx proxy
    // This works for both Docker (localhost) and Azure (mai-monetize.com)
    return '';
  }
  
  // Fallback: use relative URL for Docker/production
  return '';
};

// Default API base URLs
export const LICENSING_API = getApiBase('VITE_API_URL', 3000);
export const NEGOTIATION_API = getApiBase('VITE_NEGOTIATION_API_URL', 3003);

// WebSocket URL - only enable for local dev when negotiation-agent is available
export const getSocketUrl = () => {
  // If explicitly set via env var, use it
  if (import.meta.env.VITE_NEGOTIATION_API_URL) {
    return import.meta.env.VITE_NEGOTIATION_API_URL;
  }
  
  // Only enable for local dev (localhost:5173)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = window.location.port;
    if (hostname === 'localhost' && port === '5173') {
      return 'http://localhost:3003'; // Local negotiation-agent
    }
  }
  
  // Production/Docker: negotiation-agent not available, disable WebSocket
  return null;
};

