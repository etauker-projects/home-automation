# RestConnector - Zero Dependency REST API Client

A type-safe, zero-dependency HTTP client built on Node.js native modules for making REST API requests.

## Features

- ✅ **Zero external dependencies** - Uses only Node.js built-in modules (`http`, `https`, `url`)
- ✅ **Type-safe** - Full TypeScript support with generics for request/response types
- ✅ **Conditional body types** - TypeScript enforces body requirements based on HTTP method
- ✅ **Automatic JSON handling** - Serializes request bodies and parses JSON responses
- ✅ **Query parameter encoding** - Builds query strings from objects
- ✅ **Configurable timeouts** - Set request timeouts per call
- ✅ **HTTPS support** - Includes SSL/TLS certificate validation control
- ✅ **Promise-based** - Modern async/await API (no callbacks)
- ✅ **Comprehensive error handling** - Detailed error information with RestError

## Installation

The RestConnector is part of the framework and requires no additional dependencies.

```typescript
import { RestConnector } from './api/framework/rest/rest.module.js';
```

## Basic Usage

### Creating a Connector

```typescript
import { RestConnector } from './rest.module.js';

const connector = new RestConnector('https://api.example.com');
```

### GET Request

```typescript
// Simple GET request
const response = await connector.call({
  method: 'GET',
  url: '/users'
});

// GET with query parameters
const filtered = await connector.call({
  method: 'GET',
  url: '/users',
  query: { page: 1, limit: 10, active: true }
});
// Calls: https://api.example.com/users?page=1&limit=10&active=true

// GET with headers
const authenticated = await connector.call({
  method: 'GET',
  url: '/users/me',
  headers: {
    'Authorization': 'Bearer your-token-here',
    'Accept': 'application/json'
  }
});
```

### POST Request

```typescript
// POST with JSON body
const newUser = await connector.call({
  method: 'POST',
  url: '/users',
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  },
  headers: {
    'Authorization': 'Bearer your-token-here'
  }
});

// Note: body is REQUIRED for POST/PUT/PATCH methods
// TypeScript will show an error if you omit it
```

### PUT Request

```typescript
const updated = await connector.call({
  method: 'PUT',
  url: '/users/123',
  body: {
    name: 'Jane Doe',
    email: 'jane@example.com'
  }
});
```

### DELETE Request

```typescript
const deleted = await connector.call({
  method: 'DELETE',
  url: '/users/123'
});
// Note: DELETE does not accept a body
```

## Type Safety

### Typed Responses

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Response data is typed as User
const response = await connector.call<User>({
  method: 'GET',
  url: '/users/123'
});

console.log(response.data.name); // TypeScript knows about .name
```

### Typed Request Bodies

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

interface CreateUserDto {
  name: string;
  email: string;
}

// Both request and response are typed
const response = await connector.call<User, CreateUserDto>({
  method: 'POST',
  url: '/users',
  body: {
    name: 'John',
    email: 'john@example.com'
    // TypeScript will error if you add invalid fields
  }
});
```

### Method-Based Body Requirements

TypeScript enforces correct body usage based on HTTP method:

```typescript
// ✅ Correct: POST with body
await connector.call({
  method: 'POST',
  url: '/users',
  body: { name: 'John' }
});

// ❌ TypeScript Error: POST requires body
await connector.call({
  method: 'POST',
  url: '/users'
  // Missing body - TypeScript will complain
});

// ✅ Correct: GET without body
await connector.call({
  method: 'GET',
  url: '/users'
});

// ❌ TypeScript Error: GET cannot have body
await connector.call({
  method: 'GET',
  url: '/users',
  body: { name: 'John' } // TypeScript will error
});
```

## Advanced Features

### Custom Timeouts

```typescript
// Set a custom timeout (in milliseconds)
const response = await connector.call({
  method: 'GET',
  url: '/slow-endpoint',
  timeout: 60000 // 60 seconds
});
// Default timeout is 30 seconds
```

### HTTPS Certificate Validation

```typescript
// Disable certificate validation (useful for self-signed certs in development)
const response = await connector.call({
  method: 'GET',
  url: '/api/data',
  rejectUnauthorized: false
});
// Default is true (validate certificates)
```

### Response Object Structure

```typescript
const response = await connector.call({
  method: 'GET',
  url: '/users'
});

console.log(response.status);      // HTTP status code (e.g., 200)
console.log(response.statusText);  // Status message (e.g., 'OK')
console.log(response.headers);     // Response headers as object
console.log(response.data);        // Parsed response body
```

## Error Handling

The RestConnector throws `RestError` for failed requests:

```typescript
import { RestError } from './rest.module.js';

try {
  const response = await connector.call({
    method: 'GET',
    url: '/users/999'
  });
} catch (error) {
  if (error instanceof RestError) {
    console.error('Status:', error.code);        // HTTP status code
    console.error('Message:', error.message);    // Error message
    console.error('URL:', error.url);            // The URL that failed
    console.error('Headers:', error.headers);    // Response headers
    console.error('Body:', error.body);          // Response body
    
    // Get formatted error details
    console.error(error.toDetailedString());
  }
}
```

### Common Error Scenarios

```typescript
// 404 Not Found
try {
  await connector.call({ method: 'GET', url: '/not-found' });
} catch (error) {
  // error.code === 404
  // error.message === "Not Found" (or custom message from API)
}

// Network error
try {
  await connector.call({ method: 'GET', url: '/endpoint' });
} catch (error) {
  // error.code === 0 (indicates network issue)
  // error.message === "Request failed: ..."
}

// Timeout
try {
  await connector.call({ 
    method: 'GET', 
    url: '/slow', 
    timeout: 1000 
  });
} catch (error) {
  // error.code === 0
  // error.message === "Request timeout after 1000ms"
}
```

## Real-World Example

Here's a complete example integrating with an external API:

```typescript
import { RestConnector, RestError } from './rest.module.js';

// Define types
interface Document {
  id: number;
  title: string;
  content: string;
  created: string;
}

interface CreateDocumentDto {
  title: string;
  content: string;
}

interface DocumentListResponse {
  count: number;
  results: Document[];
}

// Create connector
class DocumentService {
  private connector: RestConnector;
  private authToken: string;

  constructor(apiUrl: string, authToken: string) {
    this.connector = new RestConnector(apiUrl);
    this.authToken = authToken;
  }

  private getHeaders() {
    return {
      'Authorization': `Token ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  async listDocuments(page: number = 1): Promise<Document[]> {
    try {
      const response = await this.connector.call<DocumentListResponse>({
        method: 'GET',
        url: '/documents',
        query: { page, page_size: 10 },
        headers: this.getHeaders()
      });

      return response.data.results;
    } catch (error) {
      if (error instanceof RestError) {
        console.error(`Failed to list documents: ${error.message}`);
      }
      throw error;
    }
  }

  async getDocument(id: number): Promise<Document> {
    const response = await this.connector.call<Document>({
      method: 'GET',
      url: `/documents/${id}`,
      headers: this.getHeaders()
    });

    return response.data;
  }

  async createDocument(data: CreateDocumentDto): Promise<Document> {
    const response = await this.connector.call<Document, CreateDocumentDto>({
      method: 'POST',
      url: '/documents',
      body: data,
      headers: this.getHeaders()
    });

    return response.data;
  }

  async updateDocument(id: number, data: Partial<CreateDocumentDto>): Promise<Document> {
    const response = await this.connector.call<Document, Partial<CreateDocumentDto>>({
      method: 'PATCH',
      url: `/documents/${id}`,
      body: data,
      headers: this.getHeaders()
    });

    return response.data;
  }

  async deleteDocument(id: number): Promise<void> {
    await this.connector.call({
      method: 'DELETE',
      url: `/documents/${id}`,
      headers: this.getHeaders()
    });
  }
}

// Usage
const service = new DocumentService('https://api.example.com', 'your-token');

const documents = await service.listDocuments(1);
const document = await service.getDocument(123);
const newDoc = await service.createDocument({
  title: 'My Document',
  content: 'Content here'
});
```

## API Reference

### RestConnector

#### Constructor
```typescript
new RestConnector(baseUrl: string)
```
- `baseUrl`: The base URL for all requests (e.g., `'https://api.example.com'`)

#### Methods

##### `call<Res, Req>(options: RestRequestOptions<Res, Req>): Promise<RestResponse<Res>>`

Makes an HTTP request with the specified options.

**Type Parameters:**
- `Res`: Expected response data type (default: `any`)
- `Req`: Request body type for POST/PUT/PATCH (default: `any`)

**Parameters:**
- `options.method`: HTTP method (`'GET'`, `'POST'`, `'PUT'`, `'DELETE'`, `'PATCH'`, `'HEAD'`, `'OPTIONS'`)
- `options.url`: Path relative to base URL
- `options.headers`: Optional HTTP headers
- `options.query`: Optional query parameters
- `options.body`: Request body (required for POST/PUT/PATCH, forbidden for others)
- `options.timeout`: Request timeout in milliseconds (default: 30000)
- `options.rejectUnauthorized`: Validate SSL certificates (default: true)

**Returns:** Promise resolving to `RestResponse<Res>`

**Throws:** `RestError` on request failure or non-2xx status codes

### RestError

Extends `HttpError` with additional context.

**Properties:**
- `code: number`: HTTP status code
- `message: string`: Error message
- `url: string`: The URL that was requested
- `headers?: Record<string, string>`: Response headers
- `body?: any`: Response body

**Methods:**
- `toDetailedString(): string`: Returns formatted error details

## Comparison with Alternatives

Unlike libraries like Axios or node-fetch, RestConnector:
- ✅ Has **zero dependencies** - no npm packages to install or update
- ✅ Uses **native Node.js modules** - leverages built-in `http`/`https`
- ✅ Provides **advanced TypeScript types** - compile-time safety for method/body combinations
- ✅ Is **lightweight** - minimal code, no bloat
- ⚠️ Focuses on **simplicity** - fewer features but easier to understand and maintain

## Contributing

This is part of the home-automation framework. For issues or improvements, please refer to the main project documentation.

## License

See the main project LICENSE file.
