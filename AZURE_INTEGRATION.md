# Azure Workflow Provider Integration

## Overview

The Azure Workflow Provider allows you to use Azure AI agents through the same `/api/v1/chat/completions` endpoint as OpenAI models. This integration connects to an external Azure workflow system that processes AI requests and returns responses through Server-Sent Events (SSE).

## Usage

To use an Azure model, simply set the `model` parameter to start with `azure/`:

```json
{
  "model": "azure/SimpleAgent",
  "messages": [
    {
      "role": "user",
      "content": "Tell me a joke"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 100,
  "stream": false
}
```

## How It Works

1. **Model Detection**: The system detects Azure models by checking if the model name starts with `azure/`
2. **Agent Extraction**: The agent name is extracted from the model (e.g., `azure/SimpleAgent` → `SimpleAgent`)
3. **Workflow Request**: A request is sent to the Azure workflow system:
   ```
   POST http://52.152.196.217:4500/admin/workflows/execute/chat_workflow
   ```
4. **SSE Stream**: The system connects to the SSE stream to receive responses:
   ```
   GET http://52.152.196.217:4500/admin/stream/events/chat_workflow
   ```
5. **Response Formatting**: The Azure response is formatted to be OpenAI-compatible

## Available Models

- `azure/SimpleAgent` - A simple agent for general conversations and tasks

## Supported Features

- ✅ Non-streaming completions
- ✅ Streaming completions
- ✅ OpenAI-compatible response format
- ✅ Usage tracking
- ✅ Thread integration
- ✅ Model listing in `/models` endpoint

## Example Request

```bash
curl -X POST http://localhost:8787/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "model": "azure/SimpleAgent",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

## Example Response

```json
{
  "id": "chatcmpl-1752768032902",
  "object": "chat.completion",
  "created": 1752768032,
  "model": "azure/SimpleAgent",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 8,
    "completion_tokens": 9,
    "total_tokens": 17
  }
}
```

## Configuration

No additional configuration is required. The Azure provider is automatically available when you use a model that starts with `azure/`.

## Error Handling

The system includes comprehensive error handling:
- Network errors when connecting to the Azure workflow system
- Timeout errors for SSE connections
- Invalid response format errors
- Missing execution ID errors

## Testing

Run the provided test scripts to verify the integration:

```bash
# Test Azure workflow directly
node test-azure-workflow.js

# Test completion API integration
node test-final-integration.js
```

## Architecture

The Azure provider is implemented as part of the AI provider system:

```
CompletionService → createAIProvider(env, model) → AzureWorkflowProvider
```

When a model starts with `azure/`, the system automatically uses the `AzureWorkflowProvider` instead of the `OpenAIProvider` or `MockAIProvider`.
