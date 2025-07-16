// Types for OpenAI-compatible chat completions API

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string; // Optional - will use default if not provided
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  n?: number; // Number of completions (default: 1)
  stream?: boolean;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string; // User identifier for abuse monitoring
  
  // Thread integration (custom extension)
  thread_id?: string; // If provided, integrate with existing thread
}

export interface ChatCompletionChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string;
  };
  finish_reason: 'stop' | 'length' | 'content_filter' | null;
  logprobs?: any;
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: ChatCompletionUsage;
  system_fingerprint?: string;
}

export interface ChatCompletionStreamChoice {
  index: number;
  delta: {
    role?: 'assistant';
    content?: string;
  };
  finish_reason: 'stop' | 'length' | 'content_filter' | null;
  logprobs?: any;
}

export interface ChatCompletionStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatCompletionStreamChoice[];
  system_fingerprint?: string;
}

// Database completion record
export interface CompletionRecord {
  id: string;
  userId: string;
  threadId?: string;
  messageId?: string;
  model?: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  stream: boolean;
  response: ChatCompletionResponse;
  usage?: ChatCompletionUsage;
  finishReason?: string;
  requestId: string;
  createdAt: Date;
  completedAt?: Date;
}

// Available models
export interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: 'openai' | 'anthropic' | 'local';
  maxTokens: number;
  supportsStreaming: boolean;
  isDefault?: boolean;
}

export const DEFAULT_MODELS: AIModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most advanced multimodal flagship model, cheaper and faster than GPT-4 Turbo',
    provider: 'openai',
    maxTokens: 128000,
    supportsStreaming: true,
    isDefault: true
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Affordable and intelligent small model for fast, lightweight tasks',
    provider: 'openai',
    maxTokens: 128000,
    supportsStreaming: true
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Previous generation flagship model with vision capabilities',
    provider: 'openai',
    maxTokens: 128000,
    supportsStreaming: true
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'Previous generation flagship model for complex reasoning',
    provider: 'openai',
    maxTokens: 8192,
    supportsStreaming: true
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and efficient model for most conversational tasks',
    provider: 'openai',
    maxTokens: 16385,
    supportsStreaming: true
  },
  {
    id: 'o1',
    name: 'o1',
    description: 'New reasoning model for complex problems (math, coding, science)',
    provider: 'openai',
    maxTokens: 200000,
    supportsStreaming: false
  },
  {
    id: 'o1-mini',
    name: 'o1 Mini',
    description: 'Faster reasoning model for coding, math, and science tasks',
    provider: 'openai',
    maxTokens: 65536,
    supportsStreaming: false
  },
  {
    id: 'o1-pro',
    name: 'o1 Pro',
    description: 'Most advanced reasoning model for research-level tasks',
    provider: 'openai',
    maxTokens: 200000,
    supportsStreaming: false
  },
  {
    id: 'o3-mini',
    name: 'o3 Mini',
    description: 'Latest generation reasoning model (preview)',
    provider: 'openai',
    maxTokens: 200000,
    supportsStreaming: false
  }
];
