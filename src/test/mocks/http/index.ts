/**
 * HTTP Boundary Mocks
 * 
 * This module exports mocks for HTTP/network operations.
 * These are boundary mocks: external network dependencies we don't control.
 * 
 * USE THESE FOR: Testing API calls, network error handling
 * DON'T USE FOR: Business logic, domain operations, internal services
 */

export { MockHttpClient, createMockFetch } from './client';
export type { MockHttpResponse, MockHttpRequest } from './client';