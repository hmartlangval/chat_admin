import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import useWebSocket from 'react-use-websocket';
import MessageBubble from './MessageBubble';

interface Message {
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: number;
}

interface WebSocketMessage {
  event: string;
  messages?: Message[];
}

interface ConversationDisplayProps {
  isChannelActive: boolean;
  clearMessages?: boolean;
}

const ConversationDisplay: React.FC<ConversationDisplayProps> = ({ 
  isChannelActive,
  clearMessages = false
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // WebSocket connection
  const { lastJsonMessage } = useWebSocket<WebSocketMessage>('ws://localhost:8000/ws', {
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear messages when clearMessages prop changes to true
  useEffect(() => {
    if (clearMessages) {
      setMessages([]);
    }
  }, [clearMessages]);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get('http://localhost:8000/channel/messages');
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    if (isChannelActive) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [isChannelActive]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastJsonMessage && lastJsonMessage.event === 'new_messages' && lastJsonMessage.messages) {
      setMessages(prevMessages => [...prevMessages, ...lastJsonMessage.messages!]);
    }
  }, [lastJsonMessage]);

  return (
    <div className="bg-white rounded-lg shadow p-4 h-96 flex flex-col">
      <div className="text-lg font-semibold mb-4 pb-2 border-b">
        Conversation
      </div>
      
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {isChannelActive 
              ? 'Waiting for messages...' 
              : 'Start the channel to begin conversation'}
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message, index) => (
              <MessageBubble
                key={`${message.sender_id}-${index}-${message.timestamp}`}
                content={message.content}
                sender={message.sender_name}
                timestamp={message.timestamp}
                isServerMessage={message.sender_id === 'server_bot'}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationDisplay; 