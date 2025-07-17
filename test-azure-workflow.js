// Test Azure Workflow Provider

const testAzureWorkflow = async () => {
  console.log('Testing Azure Workflow Provider...');
  
  // Test the workflow execution endpoint
  const conversationId = `test-${Date.now()}`;
  
  try {
    const response = await fetch('http://52.152.196.217:4500/admin/workflows/execute/chat_workflow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'chat_workflow',
        input: {
          conversation_id: conversationId,
          agent_name: 'SimpleAgent',
          message: 'Hello, can you tell me a joke?'
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Workflow execution result:', result);
    
    const executionId = result.execution_id;
    console.log('Execution ID:', executionId);
    
    // Now test the SSE endpoint
    console.log('Connecting to SSE stream...');
    
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
    
    if (!sseResponse.body) {
      throw new Error('SSE response body is null');
    }
    
    const reader = sseResponse.body.getReader();
    const decoder = new TextDecoder();
    
    console.log('Listening for events...');
    let eventCount = 0;
    const maxEvents = 10; // Safety limit
    
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
            console.log('Received event:', JSON.stringify(event, null, 2));
            
            // Check if this is the response for our execution
            if (event.execution_data?.execution_id === executionId &&
                event.cloud_event?.data?.data?.conversation_id === conversationId) {
              
              const content = event.cloud_event.data.data.message.content;
              console.log('SUCCESS! Got response:', content);
              
              reader.releaseLock();
              return;
            }
            
            eventCount++;
          } catch (e) {
            console.log('Skipping invalid JSON:', data);
          }
        }
      }
    }
    
    reader.releaseLock();
    console.log('Reached max events or timeout');
    
  } catch (error) {
    console.error('Error testing Azure workflow:', error);
  }
};

testAzureWorkflow();
