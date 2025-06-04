import { SavedTest, TestStep } from './types';
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

  async closeSession(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to close session');
    }
  },

  // Element Detection
  async scanElements(sessionId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/elements`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to scan elements');
    }
    
    const data = await response.json();
    return data.elements;
  },

  async getElementScreenshot(sessionId: string, selector: string): Promise<string> {
    const response = await fetch(
      `${API_BASE_URL}/session/${sessionId}/element-screenshot?selector=${encodeURIComponent(selector)}`,
      { headers: getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error('Failed to get element screenshot');
    }
    
    const data = await response.json();
    return data.screenshot;
  },

  // Test Execution
  async executeTest(sessionId: string, steps: TestStep[]): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/execute`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ steps })
    });
    
    if (!response.ok) {
      throw new Error('Failed to execute test');
    }
  },

  // Test Management
  async getAllTests(): Promise<SavedTest[]> {
    const response = await fetch(`${API_BASE_URL}/tests`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to get tests');
    }
    
    const data = await response.json();
    return data.tests;
  },

  async saveTest(name: string, steps: TestStep[], url?: string): Promise<SavedTest> {
    const response = await fetch(`${API_BASE_URL}/tests`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, steps, url })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save test');
    }
    
    const data = await response.json();
    return data.test;
  },

  async updateTest(test: SavedTest): Promise<SavedTest> {
    const response = await fetch(`${API_BASE_URL}/tests/${test.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(test)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update test');
    }
    
    const data = await response.json();
    return data.test;
  },

  async deleteTest(testId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/tests/${testId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete test');
    }
  }
}; 