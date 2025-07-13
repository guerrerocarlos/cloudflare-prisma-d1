// Mock utilities

import { vi } from 'vitest';

// Type helper for mock functions
export interface MockPrismaFunction {
  mockResolvedValue: (value: any) => MockPrismaFunction;
  mockResolvedValueOnce: (value: any) => MockPrismaFunction;
  mockRejectedValue: (value: any) => MockPrismaFunction;
  mockRejectedValueOnce: (value: any) => MockPrismaFunction;
  mockImplementation: (fn: (...args: any[]) => any) => MockPrismaFunction;
  mockReturnValue: (value: any) => MockPrismaFunction;
  (...args: any[]): Promise<any>;
}

// Create a mock function helper
export function createPrismaMock(): MockPrismaFunction {
  const fn = vi.fn() as any;
  fn.mockResolvedValue = (value: any) => {
    fn.mockImplementation(() => Promise.resolve(value));
    return fn;
  };
  fn.mockResolvedValueOnce = (value: any) => {
    fn.mockImplementationOnce(() => Promise.resolve(value));
    return fn;
  };
  fn.mockRejectedValue = (value: any) => {
    fn.mockImplementation(() => Promise.reject(value));
    return fn;
  };
  fn.mockRejectedValueOnce = (value: any) => {
    fn.mockImplementationOnce(() => Promise.reject(value));
    return fn;
  };
  return fn;
}
