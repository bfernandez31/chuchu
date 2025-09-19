/**
 * Test utilities to fix TypeScript issues
 */

import { jest } from '@jest/globals';

// Fix fetch mock typing
export function createMockFetch(): jest.MockedFunction<typeof fetch> {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as Response)
  ) as jest.MockedFunction<typeof fetch>;
}

// Mock response helpers
export function createMockResponse(data: any, ok: boolean = true, status: number = 200) {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(data)
  } as unknown as Response;
}