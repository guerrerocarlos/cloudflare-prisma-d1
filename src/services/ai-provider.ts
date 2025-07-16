// AI Provider interface and implementations

import type { 
  ChatCompletionRequest, 
  ChatCompletionResponse, 
  ChatCompletionStreamChunk, 
  AIModel
} from '../types/completions';
import { DEFAULT_MODELS } from '../types/completions';

export interface AIProvider {
  generateCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  generateStreamingCompletion(request: ChatCompletionRequest): AsyncGenerator<ChatCompletionStreamChunk>;
  getSupportedModels(): AIModel[];
}

// Mock AI Provider for development/testing
export class MockAIProvider implements AIProvider {
  async generateCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const model = request.model || 'gpt-4o';
    const id = `chatcmpl-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate mock response based on the last user message
    const lastUserMessage = [...request.messages].reverse().find(m => m.role === 'user');
    const content = this.generateMockResponse(lastUserMessage?.content || '');
    
    return {
      id,
      object: 'chat.completion',
      created,
      model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: this.estimateTokens(request.messages.map(m => m.content).join(' ')),
        completion_tokens: this.estimateTokens(content),
        total_tokens: 0 // Will be calculated
      }
    };
  }

  async* generateStreamingCompletion(request: ChatCompletionRequest): AsyncGenerator<ChatCompletionStreamChunk> {
    const model = request.model || 'gpt-4o';
    const id = `chatcmpl-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);
    
    // Generate mock response
    const lastUserMessage = [...request.messages].reverse().find(m => m.role === 'user');
    const content = this.generateMockResponse(lastUserMessage?.content || '');
    
    // Split content into chunks for streaming
    const words = content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate streaming delay
      
      const chunk: ChatCompletionStreamChunk = {
        id,
        object: 'chat.completion.chunk',
        created,
        model,
        choices: [{
          index: 0,
          delta: {
            content: (i === 0 ? '' : ' ') + words[i]
          },
          finish_reason: null
        }]
      };
      
      yield chunk;
    }
    
    // Final chunk with finish_reason
    yield {
      id,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [{
        index: 0,
        delta: {},
        finish_reason: 'stop'
      }]
    };
  }

  getSupportedModels(): AIModel[] {
    return DEFAULT_MODELS;
  }

  private generateMockResponse(userInput: string): string {
    const responses = [
      `I understand you're asking about "${userInput}". Let me help you with that.`,
      `That's an interesting question about "${userInput}". Here's what I think:`,
      `Based on your query about "${userInput}", I can provide some insights.`,
      `Great question! Regarding "${userInput}", here's my response:`,
    ];
    
    const baseResponse = responses[Math.floor(Math.random() * responses.length)];
    const additionalContent = [
      'This is a comprehensive topic that involves several key considerations.',
      'There are multiple approaches to this, each with their own benefits.',
      'Let me break this down into manageable components for you.',
      'I recommend considering the following factors when addressing this.'
    ];
    
    return `${baseResponse}\n\n${additionalContent[Math.floor(Math.random() * additionalContent.length)]}`;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

// OpenAI Provider (real implementation)
export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const { stream, ...requestBody } = request;
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...requestBody,
        model: request.model || 'gpt-4o',
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const completion: ChatCompletionResponse = await response.json();
    
    // Calculate total tokens if not provided
    if (completion.usage) {
      completion.usage.total_tokens = completion.usage.prompt_tokens + completion.usage.completion_tokens;
    }

    return completion;
  }

  async* generateStreamingCompletion(request: ChatCompletionRequest): AsyncGenerator<ChatCompletionStreamChunk> {
    const { stream, ...requestBody } = request;
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...requestBody,
        model: request.model || 'gpt-4o',
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed: ChatCompletionStreamChunk = JSON.parse(data);
              yield parsed;
            } catch (e) {
              // Skip invalid JSON chunks
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  getSupportedModels(): AIModel[] {
    return DEFAULT_MODELS.filter(model => model.provider === 'openai');
  }
}

// Factory to get the appropriate provider
export function createAIProvider(env: any): AIProvider {
  // Use OpenAI provider if API key is available, otherwise fallback to mock
  if (env.OPENAI_API_KEY) {
    console.log('Using OpenAI provider with API key');
    return new OpenAIProvider(env.OPENAI_API_KEY);
  }
  
  console.log('No OpenAI API key found, using mock provider');
  return new MockAIProvider();
}
