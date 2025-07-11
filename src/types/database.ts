// Database Entity Types (Generated from Prisma Schema)

export type UserRole = 'ADMIN' | 'USER';
export type ThreadStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';
export type ArtifactType = 'INSIGHT' | 'REPORT' | 'DASHBOARD' | 'PDF' | 'REFERENCE';

export interface User {
  id: string;
  email: string;
  name?: string;
  nick?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  googleId?: string;
  avatarUrl?: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface Thread {
  id: string;
  userId: string;
  title?: string;
  status: ThreadStatus;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  threadId: string;
  userId?: string;
  role: MessageRole;
  content: string;
  blocks?: Record<string, any>; // JSON stored blocks
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  metadata?: Record<string, any>;
}

export interface File {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  storageUrl: string;
  previewUrl?: string;
  uploadedBy: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface MessageFile {
  id: string;
  messageId: string;
  fileId: string;
}

export interface Artifact {
  id: string;
  threadId: string;
  userId: string;
  type: ArtifactType;
  title: string;
  description?: string;
  data: Record<string, any>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface ArtifactFile {
  id: string;
  artifactId: string;
  fileId: string;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

// Extended types with relations
export interface ThreadWithRelations extends Thread {
  user: User;
  messages: MessageWithRelations[];
  artifacts: ArtifactWithRelations[];
  _count?: {
    messages: number;
    artifacts: number;
  };
}

export interface MessageWithRelations extends Message {
  thread: Thread;
  user?: User;
  reactions: ReactionWithUser[];
  files: MessageFileWithFile[];
}

export interface MessageFileWithFile extends MessageFile {
  file: File;
}

export interface ArtifactWithRelations extends Artifact {
  thread: Thread;
  user: User;
  files: ArtifactFileWithFile[];
}

export interface ArtifactFileWithFile extends ArtifactFile {
  file: File;
}

export interface ReactionWithUser extends Reaction {
  user: User;
}

export interface SessionWithUser extends Session {
  user: User;
}

// Database operation types
export interface CreateUserData {
  email: string;
  name?: string;
  nick?: string;
  role?: UserRole;
  googleId?: string;
  avatarUrl?: string;
}

export interface UpdateUserData {
  name?: string;
  nick?: string;
  role?: UserRole;
  lastLoginAt?: Date;
  avatarUrl?: string;
}

export interface CreateThreadData {
  userId: string;
  title?: string;
  status?: ThreadStatus;
  metadata?: Record<string, any>;
}

export interface UpdateThreadData {
  title?: string;
  status?: ThreadStatus;
  metadata?: Record<string, any>;
}

export interface CreateMessageData {
  threadId: string;
  userId?: string;
  role: MessageRole;
  content: string;
  blocks?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateMessageData {
  content?: string;
  blocks?: Record<string, any>;
  editedAt?: Date;
  metadata?: Record<string, any>;
}

export interface CreateFileData {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  storageUrl: string;
  previewUrl?: string;
  uploadedBy: string;
  metadata?: Record<string, any>;
}

export interface CreateArtifactData {
  threadId: string;
  userId: string;
  type: ArtifactType;
  title: string;
  description?: string;
  data: Record<string, any>;
  version?: number;
  metadata?: Record<string, any>;
}

export interface UpdateArtifactData {
  title?: string;
  description?: string;
  data?: Record<string, any>;
  version?: number;
  metadata?: Record<string, any>;
}

export interface CreateReactionData {
  messageId: string;
  userId: string;
  emoji: string;
}

export interface CreateSessionData {
  userId: string;
  token: string;
  expiresAt: Date;
}

// Query filter types
export interface ThreadFilters {
  userId?: string;
  status?: ThreadStatus;
  createdAfter?: Date;
  createdBefore?: Date;
  title?: string;
}

export interface MessageFilters {
  threadId?: string;
  userId?: string;
  role?: MessageRole;
  createdAfter?: Date;
  createdBefore?: Date;
  hasAttachments?: boolean;
}

export interface ArtifactFilters {
  threadId?: string;
  userId?: string;
  type?: ArtifactType;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface FileFilters {
  uploadedBy?: string;
  mimeType?: string;
  sizeMin?: number;
  sizeMax?: number;
  createdAfter?: Date;
  createdBefore?: Date;
}

// Pagination types
export interface PaginationOptions {
  limit?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount?: number;
}
