/**
 * HTTP methods that support request bodies
 */
export type MethodsWithBody = 'POST' | 'PUT' | 'PATCH';

/**
 * HTTP methods that do not support request bodies
 */
export type MethodsWithoutBody = 'GET' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * All supported HTTP methods
 */
export type HttpMethod = MethodsWithBody | MethodsWithoutBody;

/**
 * Base request options common to all HTTP requests
 */
export interface BaseRestRequestOptions {
  /**
   * The path relative to the base URL (e.g., '/documents' or '/api/users/123')
   */
  url: string;

  /**
   * Custom HTTP headers to include in the request
   * @example { 'Authorization': 'Bearer token123', 'Content-Type': 'application/json' }
   */
  headers?: Record<string, string>;

  /**
   * Query parameters to append to the URL
   * @example { page: 1, limit: 10, filter: 'active' }
   */
  query?: Record<string, string | number | boolean>;

  /**
   * Request timeout in milliseconds (default: 30000ms = 30s)
   */
  timeout?: number;

  /**
   * Whether to reject unauthorized SSL/TLS certificates (default: true)
   * Set to false for self-signed certificates in development
   */
  rejectUnauthorized?: boolean;
}

/**
 * Request options for HTTP methods that require a body (POST, PUT, PATCH)
 * @template Res - The expected response data type
 * @template Req - The request body type
 */
export interface RestRequestOptionsWithBody<Res = any, Req = any> extends BaseRestRequestOptions {
  method: MethodsWithBody;
  
  /**
   * Request body - required for POST, PUT, and PATCH methods
   * Will be automatically serialized to JSON
   */
  body: Req;
}

/**
 * Request options for HTTP methods that do not support a body (GET, DELETE, HEAD, OPTIONS)
 * @template Res - The expected response data type
 */
export interface RestRequestOptionsWithoutBody<Res = any> extends BaseRestRequestOptions {
  method: MethodsWithoutBody;
  
  /**
   * Body is not allowed for GET, DELETE, HEAD, and OPTIONS methods
   */
  body?: never;
}

/**
 * Discriminated union of request options based on HTTP method
 * TypeScript will enforce that:
 * - POST/PUT/PATCH requests MUST include a body
 * - GET/DELETE/HEAD/OPTIONS requests CANNOT include a body
 * 
 * @template Res - The expected response data type
 * @template Req - The request body type (only for methods with body)
 * 
 * @example
 * // GET request - no body allowed
 * const getOptions: RestRequestOptions<User> = {
 *   method: 'GET',
 *   url: '/users/123',
 *   // body: {} // ❌ TypeScript error
 * };
 * 
 * @example
 * // POST request - body required and typed
 * const postOptions: RestRequestOptions<User, CreateUserDto> = {
 *   method: 'POST',
 *   url: '/users',
 *   body: { name: 'John', email: 'john@example.com' } // ✅ Must match CreateUserDto
 * };
 */
export type RestRequestOptions<Res = any, Req = any> =
  | RestRequestOptionsWithBody<Res, Req>
  | RestRequestOptionsWithoutBody<Res>;

/**
 * HTTP response from the RestConnector
 * @template T - The type of the response data
 */
export interface RestResponse<T = any> {
  /**
   * HTTP status code (e.g., 200, 404, 500)
   */
  status: number;

  /**
   * HTTP status text (e.g., 'OK', 'Not Found', 'Internal Server Error')
   */
  statusText: string;

  /**
   * Response headers
   */
  headers: Record<string, string>;

  /**
   * Parsed response data
   * - Automatically parsed as JSON if Content-Type is application/json
   * - Otherwise returned as plain text
   */
  data: T;
}
