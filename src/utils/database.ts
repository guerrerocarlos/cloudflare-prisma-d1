// Database utility functions and Prisma client setup

import { PrismaClient } from '../generated/prisma/';
import { PrismaD1 } from '@prisma/adapter-d1';

// Initialize Prisma Client with D1 adapter
export function createPrismaClient(database: D1Database): PrismaClient {
  const adapter = new PrismaD1(database);
  return new PrismaClient({ adapter });
}

// Database connection helper
let prismaClient: PrismaClient | null = null;

export function getDatabaseClient(database?: D1Database): PrismaClient {
  // For testing environments, return a basic Prisma client or mock
  if (process.env.NODE_ENV === 'test') {
    // In tests, this should be mocked by the test setup
    return {} as PrismaClient;
  }
  
  if (!database) {
    throw new Error('Database instance is required but was not provided');
  }
  
  if (!prismaClient) {
    prismaClient = createPrismaClient(database);
  }
  return prismaClient;
}

// Helper function to handle database transactions
export async function withTransaction<T>(
  prisma: PrismaClient,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(callback);
}

// Error handling for database operations
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public constraint?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Convert Prisma errors to our custom error type
export function handleDatabaseError(error: any): DatabaseError {
  if (error.code === 'P2002') {
    return new DatabaseError(
      'A record with this value already exists',
      'UNIQUE_CONSTRAINT_VIOLATION',
      error.meta?.target?.[0]
    );
  }

  if (error.code === 'P2025') {
    return new DatabaseError(
      'Record not found',
      'RECORD_NOT_FOUND'
    );
  }

  if (error.code === 'P2003') {
    return new DatabaseError(
      'Foreign key constraint failed',
      'FOREIGN_KEY_CONSTRAINT_VIOLATION',
      error.meta?.field_name
    );
  }

  return new DatabaseError(
    error.message || 'Database operation failed',
    error.code || 'UNKNOWN_ERROR'
  );
}

// Pagination helper
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export function buildCursorPagination(params: CursorPaginationParams) {
  const { cursor, limit = 25, orderBy = 'createdAt', orderDirection = 'desc' } = params;
  
  const pagination: any = {
    take: Math.min(limit, 100), // Max 100 items per page
    orderBy: {
      [orderBy]: orderDirection
    }
  };

  if (cursor) {
    pagination.cursor = { id: cursor };
    pagination.skip = 1; // Skip the cursor item
  }

  return pagination;
}

// Generate next cursor for pagination
export function getNextCursor(items: any[], limit: number): string | undefined {
  if (items.length < limit) {
    return undefined; // No more items
  }
  
  const lastItem = items[items.length - 1];
  return lastItem?.id;
}

// Common query options
export const DEFAULT_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  nick: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
  lastLoginAt: true
} as const;

export const DEFAULT_THREAD_SELECT = {
  id: true,
  title: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  metadata: true
} as const;

export const DEFAULT_MESSAGE_SELECT = {
  id: true,
  role: true,
  content: true,
  blocks: true,
  createdAt: true,
  updatedAt: true,
  editedAt: true,
  metadata: true
} as const;

export const DEFAULT_FILE_SELECT = {
  id: true,
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  storageUrl: true,
  previewUrl: true,
  createdAt: true,
  metadata: true
} as const;

export const DEFAULT_ARTIFACT_SELECT = {
  id: true,
  type: true,
  title: true,
  description: true,
  data: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  metadata: true
} as const;

// Validation helpers for common patterns
export function isValidCuid(id: string): boolean {
  return /^[a-z0-9]{25}$/.test(id);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidRole(role: string): role is 'ADMIN' | 'USER' {
  return ['ADMIN', 'USER'].includes(role);
}

export function isValidThreadStatus(status: string): status is 'ACTIVE' | 'ARCHIVED' | 'DELETED' {
  return ['ACTIVE', 'ARCHIVED', 'DELETED'].includes(status);
}

export function isValidMessageRole(role: string): role is 'USER' | 'ASSISTANT' | 'SYSTEM' {
  return ['USER', 'ASSISTANT', 'SYSTEM'].includes(role);
}

export function isValidArtifactType(type: string): type is 'INSIGHT' | 'REPORT' | 'DASHBOARD' | 'PDF' | 'REFERENCE' {
  return ['INSIGHT', 'REPORT', 'DASHBOARD', 'PDF', 'REFERENCE'].includes(type);
}
