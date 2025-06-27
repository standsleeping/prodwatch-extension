/**
 * Mock HTTP Client for testing
 * Use this for testing network boundary interactions
 */

export interface MockHttpResponse {
  status: number;
  statusText: string;
  data?: any;
  headers?: Record<string, string>;
}

export interface MockHttpRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
}

export class MockHttpClient {
  private responses = new Map<string, MockHttpResponse>();
  private requests: MockHttpRequest[] = [];
  private shouldThrow = false;
  private throwError?: Error;

  // Configure responses
  setResponse(url: string, response: Partial<MockHttpResponse>): void {
    this.responses.set(url, {
      status: 200,
      statusText: 'OK',
      ...response
    });
  }

  setErrorResponse(url: string, status: number, statusText: string): void {
    this.responses.set(url, {
      status,
      statusText,
      data: { error: statusText }
    });
  }

  // Configure to throw network errors
  setShouldThrow(error: Error): void {
    this.shouldThrow = true;
    this.throwError = error;
  }

  clearShouldThrow(): void {
    this.shouldThrow = false;
    this.throwError = undefined;
  }

  // Mock fetch implementation
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    if (this.shouldThrow && this.throwError) {
      throw this.throwError;
    }

    // Record the request
    this.requests.push({
      url,
      method: options?.method || 'GET',
      headers: options?.headers as Record<string, string>,
      body: options?.body
    });

    const mockResponse = this.responses.get(url);
    if (!mockResponse) {
      // Default 404 response
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      mockResponse.data ? JSON.stringify(mockResponse.data) : undefined,
      {
        status: mockResponse.status,
        statusText: mockResponse.statusText,
        headers: {
          'Content-Type': 'application/json',
          ...mockResponse.headers
        }
      }
    );
  }

  // Helper methods for test verification
  getLastRequest(): MockHttpRequest | undefined {
    return this.requests[this.requests.length - 1];
  }

  getAllRequests(): MockHttpRequest[] {
    return [...this.requests];
  }

  getRequestCount(): number {
    return this.requests.length;
  }

  getRequestsTo(url: string): MockHttpRequest[] {
    return this.requests.filter(req => req.url === url);
  }

  // Reset state between tests
  reset(): void {
    this.responses.clear();
    this.requests = [];
    this.shouldThrow = false;
    this.throwError = undefined;
  }

  // Factory methods
  static create(): MockHttpClient {
    return new MockHttpClient();
  }

  static createWithSuccessResponse(url: string, data: any): MockHttpClient {
    const client = new MockHttpClient();
    client.setResponse(url, { status: 200, data });
    return client;
  }

  static createWithErrorResponse(url: string, status: number, message: string): MockHttpClient {
    const client = new MockHttpClient();
    client.setErrorResponse(url, status, message);
    return client;
  }

  static createWithNetworkError(error: Error): MockHttpClient {
    const client = new MockHttpClient();
    client.setShouldThrow(error);
    return client;
  }
}

/**
 * Mock fetch function for global fetch replacement
 */
export function createMockFetch(client: MockHttpClient): typeof fetch {
  return (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    return client.fetch(url, init);
  };
}