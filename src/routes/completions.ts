import { Context } from 'hono';
import { z } from 'zod';
import { CompletionService } from '../services/completion-service';
import { createAIProvider } from '../services/ai-provider';
import { chatCompletionRequestSchema } from '../utils/validation';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { getCurrentUser } from '../middleware/auth';

export async function createChatCompletion(c: Context) {
  try {
    // Get authenticated user
    const user = getCurrentUser(c);
    if (!user) {
      return createErrorResponse({
        type: 'authentication_error',
        title: 'Unauthorized',
        detail: 'Authentication required',
        status: 401
      });
    }

    // Validate request body
    const body = await c.req.json();
    const validationResult = chatCompletionRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return createErrorResponse({
        type: 'validation_error',
        title: 'Bad Request',
        detail: 'Invalid request body',
        status: 400
      });
    }

    const request = validationResult.data;

    // Handle streaming vs non-streaming
    if (request.stream) {
      // Set headers for streaming response
      c.header('Content-Type', 'text/event-stream');
      c.header('Cache-Control', 'no-cache');
      c.header('Connection', 'keep-alive');
      c.header('Access-Control-Allow-Origin', '*');

      // Create streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const streamGenerator = await CompletionService.createStreamingCompletion(request, user, c.env);
            
            for await (const chunk of streamGenerator) {
              const data = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
            
            // Send final chunk
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            const errorChunk = {
              error: {
                message: error instanceof Error ? error.message : 'Unknown error',
                type: 'server_error'
              }
            };
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else {
      // Non-streaming response
      const result = await CompletionService.createCompletion(request, user, c.env);
      
      return c.json(result.completion);
    }
  } catch (error) {
    console.error('Chat completion error:', error);
    
    if (error instanceof Error && error.message.includes('OpenAI API error')) {
      return createErrorResponse({
        type: 'ai_provider_error',
        title: 'Bad Gateway',
        detail: error.message,
        status: 502
      });
    }

    return createErrorResponse({
      type: 'internal_error',
      title: 'Internal Server Error',
      detail: 'An internal error occurred while processing the completion',
      status: 500
    });
  }
}

export async function listModels(c: Context) {
  try {
    // Get authenticated user
    const user = getCurrentUser(c);
    if (!user) {
      return createErrorResponse({
        type: 'authentication_error',
        title: 'Unauthorized',
        detail: 'Authentication required',
        status: 401
      });
    }

    // Get available models from completion service
    const models = await CompletionService.getAvailableModels(c.env);

    // Transform to OpenAI API format
    const modelList = {
      object: 'list',
      data: models.map(model => ({
        id: model.id,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: model.provider,
        context_length: model.maxTokens || 4096
      }))
    };

    return createSuccessResponse(modelList);
  } catch (error) {
    console.error('List models error:', error);
    return createErrorResponse({
      type: 'internal_error',
      title: 'Internal Server Error',
      detail: 'An error occurred while fetching available models',
      status: 500
    });
  }
}
