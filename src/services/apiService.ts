import { SavedTest, TestStep } from '../types';
import { authService } from './authService';

// Use the current origin to handle dynamic port assignment
const API_BASE_URL = 'https://localhost:3001/api';

const getHeaders = () => {
  const token = authService.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

export const apiService = {
  // Session Management
  async loadPage(url: string): Promise<{ sessionId: string; screenshot: string; title: string }> {
    // If the URL is for the GSTD report, make a direct request
    if (url.includes('/gstd/gstd-report')) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            ...getHeaders(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load page directly: ${response.status}`);
        }

        // For direct requests, we don't get a screenshot, so we'll return minimal data
        return {
          sessionId: 'direct-request',
          screenshot: '', // No screenshot for direct requests
          title: 'GSTD Report'
        };
      } catch (error) {
        console.error('Error loading page directly:', error);
        throw error;
      }
    }

    // For other URLs, use the backend service
    const response = await fetch(`${API_BASE_URL}/session/load`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      throw new Error('Failed to load page');
    }
    
    return response.json();
  },

  // ... rest of the service methods ...
}; 