/**
 * Base API Client
 * 
 * Provides centralized network request handling.
 * Feature-specific API calls will extend this with domain-specific methods.
 */

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method: RequestMethod;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  async request<T>(endpoint: string, options: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    const body = options.body ? JSON.stringify(options.body) : undefined;
    
    try {
      // This would be implemented with fetch or your preferred HTTP client
      // const response = await fetch(url, {
      //   method: options.method,
      //   headers,
      //   body,
      // });
      
      // if (!response.ok) {
      //   throw new Error(`API error: ${response.status}`);
      // }
      
      // return await response.json();
      
      // Placeholder implementation
      throw new Error('Not implemented');
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
  
  // Convenience methods
  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }
  
  async post<T>(endpoint: string, body: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }
  
  async put<T>(endpoint: string, body: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers });
  }
  
  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}