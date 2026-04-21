import { HttpError } from '../api/http-error.js';

/**
 * Error class for REST API request failures
 * Extends HttpError to include additional context about the failed request
 */
export class RestError extends HttpError {
  /**
   * The URL that was requested
   */
  public url: string;

  /**
   * Response headers from the failed request (if available)
   */
  public headers?: Record<string, string>;

  /**
   * Response body from the failed request (if available)
   */
  public body?: any;

  /**
   * Creates a new RestError
   * @param code - HTTP status code
   * @param message - Error message
   * @param url - The URL that was requested
   * @param headers - Response headers (optional)
   * @param body - Response body (optional)
   */
  constructor(
    code: number,
    message: string,
    url: string,
    headers?: Record<string, string>,
    body?: any
  ) {
    super(code, message);
    this.name = 'RestError';
    this.url = url;
    this.headers = headers;
    this.body = body;
  }

  /**
   * Creates a formatted error message with full context
   */
  public toDetailedString(): string {
    let details = `${this.name}: ${this.message} (${this.code})`;
    details += `\nURL: ${this.url}`;
    
    if (this.headers) {
      details += `\nHeaders: ${JSON.stringify(this.headers, null, 2)}`;
    }
    
    if (this.body) {
      details += `\nBody: ${typeof this.body === 'string' ? this.body : JSON.stringify(this.body, null, 2)}`;
    }
    
    return details;
  }
}
