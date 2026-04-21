import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { RestRequestOptions, RestResponse } from './rest.interface.js';
import { RestError } from './rest.error.js';

/**
 * Zero-dependency, Node-native REST API client for simple upstream requests
 * 
 * Features:
 * - Type-safe request/response handling with TypeScript generics
 * - Conditional body requirement based on HTTP method
 * - Automatic JSON serialization/deserialization
 * - Query parameter encoding
 * - Configurable timeouts
 * - HTTPS support with certificate validation control
 * - Promise-based API (no callbacks)
 * 
 * @example
 * ```typescript
 * const connector = new RestConnector('https://api.example.com');
 * 
 * // GET request
 * const users = await connector.call<User[]>({
 *   method: 'GET',
 *   url: '/users',
 *   query: { page: 1, limit: 10 },
 *   headers: { 'Authorization': 'Bearer token123' }
 * });
 * 
 * // POST request with typed body
 * const newUser = await connector.call<User, CreateUserDto>({
 *   method: 'POST',
 *   url: '/users',
 *   body: { name: 'John', email: 'john@example.com' }
 * });
 * ```
 */
export class RestConnector {
  private readonly baseUrl: string;
  private readonly defaultTimeout: number = 30000; // 30 seconds

  /**
   * Creates a new RestConnector instance
   * @param baseUrl - The base URL for all requests (e.g., 'https://api.example.com')
   */
  constructor(baseUrl: string) {
    // Remove trailing slash from baseUrl for consistency
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  /**
   * Makes an HTTP request with type-safe options
   * 
   * @template Res - The expected response data type
   * @template Req - The request body type (for POST/PUT/PATCH)
   * @param options - Request configuration options
   * @returns Promise resolving to the typed response
   * @throws {RestError} If the request fails or returns a non-2xx status code
   * 
   * @example
   * ```typescript
   * // GET request
   * const response = await connector.call<DocumentList>({
   *   method: 'GET',
   *   url: '/documents',
   *   query: { modified__gte: '2026-01-01' }
   * });
   * 
   * // POST request
   * const created = await connector.call<Document, CreateDocumentDto>({
   *   method: 'POST',
   *   url: '/documents',
   *   body: { title: 'New Document', content: 'Content here' }
   * });
   * ```
   */
  public async call<Res = any, Req = any>(
    options: RestRequestOptions<Res, Req>
  ): Promise<RestResponse<Res>> {
    const fullUrl = this.buildUrl(options.url, options.query);
    const parsedUrl = new URL(fullUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    
    // Select the appropriate module (http or https)
    const httpModule = isHttps ? https : http;
    
    // Prepare request body
    let bodyString: string | undefined;
    let contentLength = 0;
    
    if ('body' in options && options.body !== undefined) {
      bodyString = typeof options.body === 'string' 
        ? options.body 
        : JSON.stringify(options.body);
      contentLength = Buffer.byteLength(bodyString);
    }
    
    // Build headers
    const headers: Record<string, string> = {
      'User-Agent': 'RestConnector/1.0',
      ...(options.headers || {}),
    };
    
    // Add Content-Type and Content-Length for requests with body
    if (bodyString) {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      headers['Content-Length'] = String(contentLength);
    }
    
    // Configure the request
    const requestOptions: http.RequestOptions | https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method,
      headers: headers,
      timeout: options.timeout || this.defaultTimeout,
    };
    
    // Add HTTPS-specific options
    if (isHttps) {
      (requestOptions as https.RequestOptions).rejectUnauthorized = 
        options.rejectUnauthorized !== undefined ? options.rejectUnauthorized : true;
    }
    
    return new Promise<RestResponse<Res>>((resolve, reject) => {
      const req = httpModule.request(requestOptions, (res) => {
        const chunks: Buffer[] = [];
        
        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        
        res.on('end', () => {
          const rawBody = Buffer.concat(chunks).toString('utf-8');
          const statusCode = res.statusCode || 0;
          const statusText = res.statusMessage || '';
          
          // Parse response headers
          const responseHeaders: Record<string, string> = {};
          Object.entries(res.headers).forEach(([key, value]) => {
            responseHeaders[key] = Array.isArray(value) ? value.join(', ') : (value || '');
          });
          
          // Parse response body
          let data: any = rawBody;
          const contentType = res.headers['content-type'] || '';
          
          if (contentType.includes('application/json') && rawBody) {
            try {
              data = JSON.parse(rawBody);
            } catch (parseError) {
              // If JSON parsing fails, keep as string
              console.warn('Failed to parse JSON response:', parseError);
            }
          }
          
          // Check for error status codes
          if (statusCode < 200 || statusCode >= 300) {
            const errorMessage = this.extractErrorMessage(data, statusText);
            reject(new RestError(
              statusCode,
              errorMessage,
              fullUrl,
              responseHeaders,
              data
            ));
            return;
          }
          
          // Success response
          resolve({
            status: statusCode,
            statusText: statusText,
            headers: responseHeaders,
            data: data as Res,
          });
        });
      });
      
      // Handle request errors
      req.on('error', (error: Error) => {
        reject(new RestError(
          0,
          `Request failed: ${error.message}`,
          fullUrl
        ));
      });
      
      // Handle request timeout
      req.on('timeout', () => {
        req.destroy();
        reject(new RestError(
          0,
          `Request timeout after ${options.timeout || this.defaultTimeout}ms`,
          fullUrl
        ));
      });
      
      // Write request body if present
      if (bodyString) {
        req.write(bodyString);
      }
      
      // Send the request
      req.end();
    });
  }

  /**
   * Builds the full URL by combining base URL, path, and query parameters
   * @private
   */
  private buildUrl(
    path: string, 
    query?: Record<string, string | number | boolean>
  ): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    let url = `${this.baseUrl}${normalizedPath}`;
    
    if (query && Object.keys(query).length > 0) {
      const queryString = this.buildQueryString(query);
      url += `?${queryString}`;
    }
    
    return url;
  }

  /**
   * Builds a URL query string from an object
   * @private
   */
  private buildQueryString(query: Record<string, string | number | boolean>): string {
    return Object.entries(query)
      .map(([key, value]) => {
        const encodedKey = encodeURIComponent(key);
        const encodedValue = encodeURIComponent(String(value));
        return `${encodedKey}=${encodedValue}`;
      })
      .join('&');
  }

  /**
   * Extracts a meaningful error message from response data
   * @private
   */
  private extractErrorMessage(data: any, defaultMessage: string): string {
    if (typeof data === 'string') {
      return data || defaultMessage;
    }
    
    if (typeof data === 'object' && data !== null) {
      // Try common error message fields
      if (data.message) return data.message;
      if (data.error) return typeof data.error === 'string' ? data.error : data.error.message;
      if (data.detail) return data.detail;
    }
    
    return defaultMessage || 'Request failed';
  }
}
