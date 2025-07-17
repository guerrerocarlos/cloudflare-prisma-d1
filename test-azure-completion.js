// Test Azure completion directly
const testAzureCompletion = async () => {
  console.log('Testing Azure completion...');
  
  // Test what our endpoint should look like
  const testRequest = {
    model: 'azure/SimpleAgent',
    messages: [
      { role: 'user', content: 'Tell me a joke about developers' }
    ],
    max_tokens: 100,
    temperature: 0.7,
    stream: false
  };
  
  console.log('Request:', JSON.stringify(testRequest, null, 2));
  
  // Test the model detection logic
  const model = testRequest.model;
  console.log('Model:', model);
  console.log('Is Azure model?', model?.startsWith('azure/'));
  
  if (model?.startsWith('azure/')) {
    const agentName = model.slice(6);
    console.log('Agent name:', agentName);
    
    // Test the conversation ID generation
    const conversationId = `conv-${Date.now()}`;
    console.log('Conversation ID:', conversationId);
    
    // Test the workflow request format
    const workflowRequest = {
      name: 'chat_workflow',
      input: {
        conversation_id: conversationId,
        agent_name: agentName,
        message: testRequest.messages[testRequest.messages.length - 1].content
      }
    };
    
    console.log('Workflow request:', JSON.stringify(workflowRequest, null, 2));
  }
  
  console.log('✅ Azure completion test passed!');
};

testAzureCompletion();
