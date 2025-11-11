export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  origin?: string;
  destination?: string;
  transportMode?: string;
  ecoMode?: boolean;
  hazardsOnRoute?: string[];
  weatherConditions?: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  context?: ChatContext;
}

export interface ChatResponse {
  message: string;
  error?: string;
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  context?: ChatContext
): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        message,
        history: history.slice(-10),
        context
      } as ChatRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to get AI response' }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data: ChatResponse = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data.message;
  } catch (error) {
    console.error('Chat API error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to communicate with AI assistant');
  }
}
