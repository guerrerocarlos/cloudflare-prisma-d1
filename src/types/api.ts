// API Request and Response Types for Experience Layer
import type { UIBlockType as UIBlock } from './blocks';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: Record<string, string[]>;
  timestamp: string;
  trace_id?: string;
}

export interface ResponseMetadata {
  timestamp: string;
  correlation_id: string;
  version: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  continuationToken?: string;
  totalItems?: number;
  hasMore: boolean;
  pageSize: number;
}

// Thread API Types
export interface CreateThreadRequest {
  title?: string;
  metadata?: Record<string, any>;
}

export interface UpdateThreadRequest {
  title?: string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  metadata?: Record<string, any>;
}

export interface ThreadResponse {
  id: string;
  userId: string;
  title?: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
  messageCount?: number;
  lastMessage?: MessageResponse;
}

// Message API Types
export interface CreateMessageRequest {
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  blocks?: UIBlock[];
  attachments?: FileAttachment[];
  metadata?: Record<string, any>;
}

export interface MessageResponse {
  id: string;
  threadId: string;
  userId?: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  blocks?: UIBlock[];
  attachments?: FileAttachment[];
  reactions?: ReactionSummary[];
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  metadata?: Record<string, any>;
}

// File API Types
export interface FileUploadRequest {
  description?: string;
  tags?: string[];
  visibility?: 'thread' | 'public' | 'private';
}

export interface FileResponse {
  file_id: string;
  title: string;
  originalName: string;
  size: number;
  mime_type: string;
  checksum: string;
  upload_url?: string;
  download_url?: string;
  preview_url?: string;
  preview_available: boolean;
  metadata?: Record<string, any>;
  uploaded_by: string;
  uploaded_at: string;
}

export interface FileAttachment {
  file_id: string;
  title: string;
  size?: number;
  mime_type?: string;
}

// Reaction API Types
export interface AddReactionRequest {
  emoji: string;
  action: 'add' | 'remove';
}

export interface ReactionResponse {
  emoji: string;
  count: number;
  users: string[];
  user_reacted: boolean;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  user_reacted: boolean;
}

// Artifact API Types
export interface CreateArtifactRequest {
  type: 'INSIGHT' | 'REPORT' | 'DASHBOARD' | 'PDF' | 'REFERENCE';
  title: string;
  description?: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ArtifactResponse {
  id: string;
  threadId: string;
  userId: string;
  type: 'INSIGHT' | 'REPORT' | 'DASHBOARD' | 'PDF' | 'REFERENCE';
  title: string;
  description?: string;
  data: Record<string, any>;
  version: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
  files?: FileAttachment[];
}

// Interactive Action Types
export interface InteractiveActionRequest {
  action_id: string;
  block_id?: string;
  thread_id: string;
  message_id: string;
  user_id: string;
  action_data?: Record<string, any>;
}

export interface InteractiveActionResponse {
  action_handled: boolean;
  response_type?: 'redirect' | 'update' | 'ephemeral';
  redirect_url?: string;
  ephemeral_message?: {
    text: string;
    blocks?: UIBlock[];
  };
  updated_message?: MessageResponse;
}

// Authentication Types
export interface AuthRequest {
  googleToken: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  nick?: string;
  role: 'ADMIN' | 'USER';
  avatarUrl?: string;
  lastLoginAt?: string;
}
