/**
 * REST API Client Module
 * 
 * Provides a zero-dependency, Node-native HTTP client for making API requests.
 * 
 * @module RestModule
 * 
 * @example
 * ```typescript
 * import { RestConnector, RestRequestOptions, RestResponse } from './rest.module';
 * 
 * const connector = new RestConnector('https://api.example.com');
 * 
 * const response = await connector.call<MyResponseType>({
 *   method: 'GET',
 *   url: '/endpoint',
 *   headers: { 'Authorization': 'Bearer token' }
 * });
 * ```
 */

// Main connector class
export { RestConnector } from './rest.connector.js';

// Error handling
export { RestError } from './rest.error.js';

// Type definitions
export type {
  HttpMethod,
  MethodsWithBody,
  MethodsWithoutBody,
  BaseRestRequestOptions,
  RestRequestOptions,
  RestRequestOptionsWithBody,
  RestRequestOptionsWithoutBody,
  RestResponse,
} from './rest.interface.js';
