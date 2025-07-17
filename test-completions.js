// Test completions API with Azure model
import { CompletionService } from './src/services/completion-service.js';

const testCompletion = async () => {
  console.log('Testing Azure completions...');
  
  const mockUser = { id: 'test-user' };
  const mockEnv = {}; // No OpenAI key
  
  const request = {
    model: 'azure/SimpleAgent',
    messages: [
      { role: 'user', content: 'Tell me a joke about programming' }
    ]
  };
  
  try {
    const result = await CompletionService.createCompletion(request, mockUser, mockEnv);
    console.log('Success! Response:', result.completion);
  } catch (error) {
    console.error('Error:', error);
  }
};

testCompletion();
