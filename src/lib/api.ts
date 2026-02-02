// src/lib/api.ts

export const BASE_URL = 'https://cbt-backend-chi.vercel.app/api';

interface FetchOptions extends RequestInit {
  // You can add custom options here if needed later
}

export const apiRequest = async <T>(endpoint: string, options: FetchOptions = {}): Promise<T> => {
  // 1. Get the token
  const token = localStorage.getItem('token');

  // 2. Prepare Headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}), // Merge any custom headers passed in
  };

  // 3. Attach Token if it exists
  if (token) {
    (headers as any)['x-auth-token'] = token;
  }

  // 4. Configure the config object
  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    // 5. Make the actual request
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // 6. Handle 401 (Unauthorized) specifically if you want
    if (response.status === 401) {
      // Optional: Clear token and redirect
      // localStorage.removeItem('token');
      // window.location.href = '/auth';
    }

    // 7. Check if response is NOT ok (e.g., 400, 404, 500)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.msg || errorData.message || 'API request failed');
    }

    // 8. Return parsed JSON
    // Some endpoints (like DELETE) might return no content
    if (response.status === 204) {
        return {} as T;
    }
    
    return await response.json();

  } catch (error) {
    console.error('API Request Error:', error);
    throw error; // Re-throw so the component knows something went wrong
  }
};