/**
 * Example usage of the RestConnector
 * This file demonstrates how to use the RestConnector in real-world scenarios
 */

import { RestConnector, RestError } from './rest.module.js';

// ============================================================================
// Example 1: Simple GET Request
// ============================================================================

async function simpleGetExample() {
  const connector = new RestConnector('https://api.example.com');
  
  try {
    const response = await connector.call({
      method: 'GET',
      url: '/users'
    });
    
    console.log('Users:', response.data);
  } catch (error) {
    if (error instanceof RestError) {
      console.error('Request failed:', error.message);
    }
  }
}

// ============================================================================
// Example 2: GET with Query Parameters and Headers
// ============================================================================

interface User {
  id: number;
  name: string;
  email: string;
}

interface UserListResponse {
  count: number;
  results: User[];
}

async function getWithQueryAndHeadersExample() {
  const connector = new RestConnector('https://api.example.com');
  
  const response = await connector.call<UserListResponse>({
    method: 'GET',
    url: '/users',
    query: {
      page: 1,
      limit: 10,
      active: true
    },
    headers: {
      'Authorization': 'Bearer your-token-here'
    }
  });
  
  console.log(`Found ${response.data.count} users`);
  console.log('First user:', response.data.results[0]);
}

// ============================================================================
// Example 3: POST Request with Typed Body
// ============================================================================

interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

async function postWithTypedBodyExample() {
  const connector = new RestConnector('https://api.example.com');
  
  const newUserData: CreateUserDto = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'secure123'
  };
  
  const response = await connector.call<User, CreateUserDto>({
    method: 'POST',
    url: '/users',
    body: newUserData,
    headers: {
      'Authorization': 'Bearer your-token-here'
    }
  });
  
  console.log('Created user:', response.data);
}

// ============================================================================
// Example 4: Service Class Pattern (Recommended)
// ============================================================================

class UserService {
  private connector: RestConnector;
  private authToken: string;
  
  constructor(apiUrl: string, authToken: string) {
    this.connector = new RestConnector(apiUrl);
    this.authToken = authToken;
  }
  
  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }
  
  async listUsers(page: number = 1, limit: number = 10): Promise<User[]> {
    const response = await this.connector.call<UserListResponse>({
      method: 'GET',
      url: '/users',
      query: { page, limit },
      headers: this.getHeaders()
    });
    
    return response.data.results;
  }
  
  async getUser(id: number): Promise<User> {
    const response = await this.connector.call<User>({
      method: 'GET',
      url: `/users/${id}`,
      headers: this.getHeaders()
    });
    
    return response.data;
  }
  
  async createUser(data: CreateUserDto): Promise<User> {
    const response = await this.connector.call<User, CreateUserDto>({
      method: 'POST',
      url: '/users',
      body: data,
      headers: this.getHeaders()
    });
    
    return response.data;
  }
  
  async updateUser(id: number, data: Partial<CreateUserDto>): Promise<User> {
    const response = await this.connector.call<User, Partial<CreateUserDto>>({
      method: 'PATCH',
      url: `/users/${id}`,
      body: data,
      headers: this.getHeaders()
    });
    
    return response.data;
  }
  
  async deleteUser(id: number): Promise<void> {
    await this.connector.call({
      method: 'DELETE',
      url: `/users/${id}`,
      headers: this.getHeaders()
    });
  }
}

// Usage of service class
async function serviceClassExample() {
  const userService = new UserService('https://api.example.com', 'your-token');
  
  // List users
  const users = await userService.listUsers(1, 10);
  console.log('Users:', users);
  
  // Get specific user
  const user = await userService.getUser(123);
  console.log('User:', user);
  
  // Create user
  const newUser = await userService.createUser({
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'secure456'
  });
  console.log('Created:', newUser);
  
  // Update user
  const updated = await userService.updateUser(123, {
    name: 'Jane Smith'
  });
  console.log('Updated:', updated);
  
  // Delete user
  await userService.deleteUser(123);
  console.log('User deleted');
}

// ============================================================================
// Example 5: Error Handling
// ============================================================================

async function errorHandlingExample() {
  const connector = new RestConnector('https://api.example.com');
  
  try {
    await connector.call({
      method: 'GET',
      url: '/users/999'
    });
  } catch (error) {
    if (error instanceof RestError) {
      console.error('HTTP Status:', error.code);
      console.error('Error Message:', error.message);
      console.error('Request URL:', error.url);
      console.error('Response Headers:', error.headers);
      console.error('Response Body:', error.body);
      
      // Get detailed formatted error
      console.error('\nDetailed Error:');
      console.error(error.toDetailedString());
      
      // Handle specific error codes
      if (error.code === 404) {
        console.log('Resource not found');
      } else if (error.code === 401) {
        console.log('Unauthorized - check your token');
      } else if (error.code === 0) {
        console.log('Network error or timeout');
      }
    }
  }
}

// ============================================================================
// Example 6: Advanced Configuration
// ============================================================================

async function advancedConfigurationExample() {
  const connector = new RestConnector('https://api.example.com');
  
  // Custom timeout
  await connector.call({
    method: 'GET',
    url: '/slow-endpoint',
    timeout: 60000 // 60 seconds instead of default 30
  });
  
  // Disable SSL certificate validation (for self-signed certs in dev)
  await connector.call({
    method: 'GET',
    url: '/api/data',
    rejectUnauthorized: false // Only use in development!
  });
}

// ============================================================================
// Example 7: Paperless API Integration (Real-world)
// ============================================================================

interface PaperlessDocument {
  id: number;
  title: string;
  content: string;
  correspondent: number;
  document_type: number;
  created: string;
}

interface PaperlessListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PaperlessDocument[];
}

class PaperlessApiClient {
  private connector: RestConnector;
  private token: string;
  
  constructor(host: string, token: string) {
    this.connector = new RestConnector(host);
    this.token = token;
  }
  
  private getHeaders() {
    return {
      'Authorization': `Token ${this.token}`,
      'Accept': 'application/json'
    };
  }
  
  async searchDocuments(modifiedSince?: string, page: number = 1): Promise<PaperlessDocument[]> {
    const query: Record<string, string | number> = {
      page,
      page_size: 10
    };
    
    if (modifiedSince) {
      query['modified__gte'] = modifiedSince;
    }
    
    const response = await this.connector.call<PaperlessListResponse>({
      method: 'GET',
      url: '/api/documents/',
      query,
      headers: this.getHeaders()
    });
    
    return response.data.results;
  }
  
  async getDocument(id: number): Promise<PaperlessDocument> {
    const response = await this.connector.call<PaperlessDocument>({
      method: 'GET',
      url: `/api/documents/${id}/`,
      headers: this.getHeaders()
    });
    
    return response.data;
  }
  
  async downloadDocument(id: number): Promise<Buffer> {
    const response = await this.connector.call<any>({
      method: 'GET',
      url: `/api/documents/${id}/download/`,
      headers: this.getHeaders()
    });
    
    // Note: For binary data, you might need to handle differently
    return response.data;
  }
}

// Usage
async function paperlessExample() {
  const paperless = new PaperlessApiClient(
    'https://paperless.office.etauker.com',
    'your-paperless-token'
  );
  
  // Search for documents modified since a date
  const documents = await paperless.searchDocuments('2026-01-01');
  console.log(`Found ${documents.length} documents`);
  
  // Get specific document
  if (documents.length > 0) {
    const doc = await paperless.getDocument(documents[0].id);
    console.log('Document:', doc.title);
  }
}
