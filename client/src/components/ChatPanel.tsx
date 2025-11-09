import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  onClose?: () => void;
  onSendMessage: (message: string) => void;
  messages?: Message[];
  isLoading?: boolean;
}

const suggestedPrompts = [
  "Find restaurants near me",
  "What's the fastest route?",
  "Show me nearby attractions",
  "Find gas stations"
];

export default function ChatPanel({
  onClose,
  onSendMessage,
  messages = [],
  isLoading = false
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handlePromptClick = (prompt: string) => {
    onSendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-card border-l border-card-border">
      <div className="flex items-center justify-between p-4 border-b border-card-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-sm">AI Navigator</div>
            <div className="text-xs text-muted-foreground">Your travel assistant</div>
          </div>
        </div>
        {onClose && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            data-testid="button-close-chat"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">Welcome to AI Navigator</h3>
              <p className="text-sm text-muted-foreground">
                Ask me anything about navigation, routes, or places
              </p>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">Suggested prompts</div>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover-elevate active-elevate-2"
                    onClick={() => handlePromptClick(prompt)}
                    data-testid={`prompt-${index}`}
                  >
                    {prompt}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                data-testid={`message-${message.id}`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' ? 'bg-secondary' : 'bg-primary'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-5 w-5 text-secondary-foreground" />
                  ) : (
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  )}
                </div>
                <div className={`flex flex-col gap-1 max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-md px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <div className="text-xs text-muted-foreground px-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="bg-secondary text-secondary-foreground rounded-md px-4 py-2">
                  <div className="flex gap-1">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-card-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about navigation, places, or routes..."
            className="min-h-[44px] max-h-32 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={isLoading}
            data-testid="input-chat"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            data-testid="button-send-message"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
