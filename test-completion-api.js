// Test the actual API endpoint with Azure model
const testCompletionAPI = async () => {
  console.log('Testing Completion API with Azure model...');
  
  // First, let's test the Azure workflow manually
  const testWorkflow = async () => {
    console.log('1. Testing Azure workflow directly...');
    
    const conversationId = `api-test-${Date.now()}`;
    
    try {
      // Send workflow request
      const workflowResponse = await fetch('http://52.152.196.217:4500/admin/workflows/execute/chat_workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'chat_workflow',
          input: {
            conversation_id: conversationId,
            agent_name: 'SimpleAgent',
            message: 'Tell me a joke about coding'
          }
        })
      });
      
      if (!workflowResponse.ok) {
        throw new Error(`Workflow request failed: ${workflowResponse.status}`);
      }
      
      const workflowResult = await workflowResponse.json();
      console.log('Workflow response:', workflowResult);
      
      // Connect to SSE stream
      console.log('2. Connecting to SSE stream...');
      
      const sseResponse = await fetch('http://52.152.196.217:4500/admin/stream/events/chat_workflow', {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!sseResponse.ok) {
        throw new Error(`SSE connection failed: ${sseResponse.status}`);
      }
      
      const reader = sseResponse.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No reader available');
      }
      
      let eventCount = 0;
      const maxEvents = 5;
      
      while (eventCount < maxEvents) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            try {
              const event = JSON.parse(data);
              
              // Check if this is our response
              if (event.cloud_event?.data?.data?.conversation_id === conversationId) {
                const content = event.cloud_event.data.data.message.content;
                console.log('3. Got response from Azure:', content);
                
                reader.releaseLock();
                
                // Now simulate the OpenAI completion format
                const completion = {
                  id: `chatcmpl-${Date.now()}`,
                  object: 'chat.completion',
                  created: Math.floor(Date.now() / 1000),
                  model: 'azure/SimpleAgent',
                  choices: [{
                    index: 0,
                    message: {
                      role: 'assistant',
                      content
                    },
                    finish_reason: 'stop'
                  }],
                  usage: {
                    prompt_tokens: 15,
                    completion_tokens: content.split(' ').length,
                    total_tokens: 15 + content.split(' ').length
                  }
                };
                
                console.log('4. Formatted completion:', JSON.stringify(completion, null, 2));
                return completion;
              }
              
              eventCount++;
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
      reader.releaseLock();
      throw new Error('No response received');
      
    } catch (error) {
      console.error('Error testing workflow:', error);
      throw error;
    }
  };
  
  await testWorkflow();
  console.log('✅ Azure workflow integration test passed!');
};

testCompletionAPI();
