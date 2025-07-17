// Test Azure provider directly
import { AzureWorkflowProvider } from './src/services/ai-provider.js';

const testAzureProvider = async () => {
  console.log('Testing Azure provider directly...');
  
  const provider = new AzureWorkflowProvider();
  
  const request = {
    model: 'azure/SimpleAgent',
    messages: [
      { role: 'user', content: 'Tell me a joke about programming' }
    ]
  };
  
  try {
    const completion = await provider.generateCompletion(request);
    console.log('Success! Completion:', completion);
  } catch (error) {
    console.error('Error:', error);
  }
};

testAzureProvider();
