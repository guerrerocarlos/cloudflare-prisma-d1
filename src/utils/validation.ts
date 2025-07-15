// Validation schemas using Zod

import { z } from 'zod';

// Common validation patterns
export const cuidSchema = z.string().regex(/^[a-z0-9]{25}$/, 'Invalid ID format');
export const emailSchema = z.string().email('Invalid email format');
export const urlSchema = z.string().url('Invalid URL format');

// Enum schemas
export const userRoleSchema = z.enum(['ADMIN', 'USER']);
export const threadStatusSchema = z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']);
export const messageRoleSchema = z.enum(['USER', 'ASSISTANT', 'SYSTEM']);
export const artifactTypeSchema = z.enum(['INSIGHT', 'REPORT', 'DASHBOARD', 'PDF', 'REFERENCE']);

// User schemas
export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(100).optional(),
  nick: z.string().min(1).max(50).optional(),
  role: userRoleSchema.optional(),
  googleId: z.string().optional(),
  avatarUrl: urlSchema.optional()
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nick: z.string().min(1).max(50).optional(),
  role: userRoleSchema.optional(),
  avatarUrl: urlSchema.optional()
});

// Thread schemas
export const createThreadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export const updateThreadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: threadStatusSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

// Message schemas
export const createMessageSchema = z.object({
  role: messageRoleSchema,
  content: z.string().min(1).max(50000),
  userId: cuidSchema.optional(), // Optional, required only for USER messages
  blocks: z.array(z.record(z.string(), z.any())).optional(),
  attachments: z.array(z.object({
    file_id: cuidSchema,
    title: z.string().min(1).max(255)
  })).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).max(50000).optional(),
  blocks: z.array(z.record(z.string(), z.any())).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

// File schemas
export const fileUploadSchema = z.object({
  description: z.string().max(500).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  visibility: z.enum(['thread', 'public', 'private']).optional()
});

export const createFileSchema = z.object({
  filename: z.string().min(1).max(255),
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  size: z.number().int().positive().max(104857600), // 100MB max
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/, 'Invalid checksum format'),
  storageUrl: urlSchema,
  previewUrl: urlSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

// Artifact schemas
export const createArtifactSchema = z.object({
  type: artifactTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  content: z.string().min(1),
  blocks: z.array(z.record(z.string(), z.any())).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export const updateArtifactSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  content: z.string().min(1).optional(),
  blocks: z.array(z.record(z.string(), z.any())).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

// Reaction schemas
export const addReactionSchema = z.object({
  emoji: z.string().min(1).max(50),
  action: z.enum(['add', 'remove'])
});

// Authentication schemas
export const authRequestSchema = z.object({
  googleToken: z.string().min(1)
});

// Interactive action schemas
export const interactiveActionSchema = z.object({
  action_id: z.string().min(1).max(255),
  block_id: z.string().min(1).max(255).optional(),
  thread_id: cuidSchema,
  message_id: cuidSchema,
  user_id: cuidSchema,
  action_data: z.record(z.string(), z.any()).optional()
});

// Query parameter schemas
export const paginationQuerySchema = z.object({
  cursor: cuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  orderBy: z.string().default('createdAt'),
  orderDirection: z.enum(['asc', 'desc']).default('desc')
});

export const threadQuerySchema = paginationQuerySchema.extend({
  status: threadStatusSchema.optional(),
  title: z.string().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional()
});

export const messageQuerySchema = paginationQuerySchema.extend({
  role: messageRoleSchema.optional(),
  hasAttachments: z.coerce.boolean().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional()
});

export const artifactQuerySchema = paginationQuerySchema.extend({
  type: artifactTypeSchema.optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional()
});

export const fileQuerySchema = paginationQuerySchema.extend({
  mimeType: z.string().optional(),
  sizeMin: z.coerce.number().int().positive().optional(),
  sizeMax: z.coerce.number().int().positive().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional()
});

// Header schemas
export const authHeaderSchema = z.object({
  authorization: z.string().regex(/^Bearer .+$/, 'Invalid authorization header format')
});

export const correlationIdHeaderSchema = z.object({
  'x-correlation-id': z.string().optional(),
  'x-trace-id': z.string().optional()
});

// Common response schemas
export const errorResponseSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string(),
  instance: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
  timestamp: z.string(),
  trace_id: z.string().optional()
});

export const successResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  metadata: z.object({
    timestamp: z.string(),
    correlation_id: z.string(),
    version: z.string()
  }).optional()
});

export const paginatedResponseSchema = z.object({
  items: z.array(z.any()),
  continuationToken: z.string().optional(),
  totalItems: z.number().optional(),
  hasMore: z.boolean(),
  pageSize: z.number()
});

// Type exports for use in handlers
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type UpdateThreadInput = z.infer<typeof updateThreadSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type CreateFileInput = z.infer<typeof createFileSchema>;
export type CreateArtifactInput = z.infer<typeof createArtifactSchema>;
export type UpdateArtifactInput = z.infer<typeof updateArtifactSchema>;
export type AddReactionInput = z.infer<typeof addReactionSchema>;
export type AuthRequestInput = z.infer<typeof authRequestSchema>;
export type InteractiveActionInput = z.infer<typeof interactiveActionSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type ThreadQuery = z.infer<typeof threadQuerySchema>;
export type MessageQuery = z.infer<typeof messageQuerySchema>;
export type ArtifactQuery = z.infer<typeof artifactQuerySchema>;
export type FileQuery = z.infer<typeof fileQuerySchema>;
