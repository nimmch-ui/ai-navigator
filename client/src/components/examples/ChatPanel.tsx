import { useState } from 'react';
import ChatPanel from '../ChatPanel';

export default function ChatPanelExample() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'user' as const,
      content: 'Find the best route to Golden Gate Bridge',
      timestamp: new Date(Date.now() - 120000)
    },
    {
      id: '2',
      role: 'assistant' as const,
      content: "I've found the optimal route to Golden Gate Bridge. It's approximately 3.5 miles and will take about 15 minutes by car via US-101 N. Would you like me to show you alternative routes or provide turn-by-turn directions?",
      timestamp: new Date(Date.now() - 60000)
    }
  ]);

  return (
    <div className="h-screen">
      <ChatPanel
        onSendMessage={(msg) => {
          const newMessage = {
            id: Date.now().toString(),
            role: 'user' as const,
            content: msg,
            timestamp: new Date()
          };
          setMessages([...messages, newMessage]);
        }}
        messages={messages}
      />
    </div>
  );
}
