// Completion service for handling chat completion requests

import { getDatabaseClient } from '../utils/database';
import { createAIProvider } from './ai-provider';
import type { AuthenticatedUser } from '../middleware/auth';
import type { 
  ChatCompletionRequest, 
  ChatCompletionResponse, 
  ChatCompletionStreamChunk,
  ChatMessage,
  CompletionRecord
} from '../types/completions';
import type { ChatCompletionRequestInput } from '../utils/validation';

export class CompletionService {
  static async createCompletion(
    request: ChatCompletionRequestInput, 
    user: AuthenticatedUser,
    env: any
  ): Promise<{ completion: ChatCompletionResponse; record: CompletionRecord }> {
    const prisma = getDatabaseClient(env.DB);
    const provider = createAIProvider(env);
    
    // Set default model if not provided
    const model = request.model || env.DEFAULT_AI_MODEL || 'gpt-4o';
    
    // Generate unique request ID
    const requestId = crypto.randomUUID();
    
    // Convert request to provider format
    const providerRequest: ChatCompletionRequest = {
      ...request,
      model
    };
    
    try {
      // Generate completion using AI provider
      const completion = await provider.generateCompletion(providerRequest);
      
      // Calculate total tokens for usage
      completion.usage.total_tokens = completion.usage.prompt_tokens + completion.usage.completion_tokens;
      
      // Handle thread integration if thread_id is provided
      let messageId: string | undefined;
      if (request.thread_id) {
        messageId = await this.integrateWithThread(
          request.thread_id,
          request.messages,
          completion,
          user,
          prisma
        );
      }
      
      // Store completion record in database
      const completionRecord = await prisma.completion.create({
        data: {
          userId: user.id,
          threadId: request.thread_id,
          messageId,
          model,
          messages: request.messages,
          maxTokens: request.max_tokens,
          temperature: request.temperature,
          topP: request.top_p,
          stop: request.stop ? (Array.isArray(request.stop) ? request.stop : [request.stop]) : null,
          stream: request.stream || false,
          response: completion,
          usage: completion.usage,
          finishReason: completion.choices[0]?.finish_reason,
          requestId,
          completedAt: new Date()
        }
      });
      
      return { 
        completion, 
        record: {
          ...completionRecord,
          messages: completionRecord.messages as ChatMessage[],
          response: completionRecord.response as ChatCompletionResponse,
          stop: completionRecord.stop as string[] | null
        }
      };
    } catch (error) {
      console.error('Error creating completion:', error);
      
      // Store failed completion record
      await prisma.completion.create({
        data: {
          userId: user.id,
          threadId: request.thread_id,
          model,
          messages: request.messages,
          maxTokens: request.max_tokens,
          temperature: request.temperature,
          topP: request.top_p,
          stop: request.stop ? (Array.isArray(request.stop) ? request.stop : [request.stop]) : null,
          stream: request.stream || false,
          response: { error: error.message },
          requestId
        }
      });
      
      throw error;
    }
  }
  
  static async* createStreamingCompletion(
    request: ChatCompletionRequestInput, 
    user: AuthenticatedUser,
    env: any
  ): AsyncGenerator<ChatCompletionStreamChunk> {
    const provider = createAIProvider(env);
    
    // Set default model if not provided
    const model = request.model || env.DEFAULT_AI_MODEL || 'gpt-4o';
    
    // Convert request to provider format
    const providerRequest: ChatCompletionRequest = {
      ...request,
      model,
      stream: true
    };
    
    // Stream completion from AI provider
    for await (const chunk of provider.generateStreamingCompletion(providerRequest)) {
      yield chunk;
    }
    
    // TODO: Store streaming completion record after completion
  }
  
  private static async integrateWithThread(
    threadId: string,
    messages: ChatMessage[],
    completion: ChatCompletionResponse,
    user: AuthenticatedUser,
    prisma: any
  ): Promise<string> {
    // Verify thread exists and user has access
    const thread = await prisma.thread.findUnique({
      where: { id: threadId }
    });
    
    if (!thread) {
      throw new Error('Thread not found');
    }
    
    if (thread.userId !== user.id) {
      throw new Error('Access denied to thread');
    }
    
    // Get the last user message from the completion request
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    
    // Create user message in thread if there's a new user message
    let userMessageId: string | undefined;
    if (lastUserMessage) {
      const userMessage = await prisma.message.create({
        data: {
          threadId,
          userId: user.id,
          role: 'USER',
          content: lastUserMessage.content,
          blocks: null,
          metadata: {
            fromCompletion: true,
            completionRequest: true
          }
        }
      });
      userMessageId = userMessage.id;
    }
    
    // Create assistant message with the completion response
    const assistantMessage = await prisma.message.create({
      data: {
        threadId,
        userId: null, // Assistant messages don't have a user
        role: 'ASSISTANT',
        content: completion.choices[0]?.message.content || '',
        blocks: null,
        metadata: {
          fromCompletion: true,
          completionId: completion.id,
          model: completion.model,
          usage: completion.usage,
          finishReason: completion.choices[0]?.finish_reason
        }
      }
    });
    
    return assistantMessage.id;
  }
  
  static async getAvailableModels(env: any) {
    const provider = createAIProvider(env);
    return provider.getSupportedModels();
  }
  
  static async getCompletion(id: string, user: AuthenticatedUser, env: any) {
    const prisma = getDatabaseClient(env.DB);
    
    const completion = await prisma.completion.findFirst({
      where: {
        id,
        userId: user.id // Ensure user can only access their own completions
      },
      include: {
        thread: true,
        message: true
      }
    });
    
    if (!completion) {
      return null;
    }
    
    return {
      ...completion,
      messages: completion.messages as ChatMessage[],
      response: completion.response as ChatCompletionResponse,
      stop: completion.stop as string[] | null
    };
  }
}
