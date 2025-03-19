import React from 'react';
import { formatDistanceToNow } from 'date-fns';

interface MessageBubbleProps {
  content: string;
  sender: string;
  timestamp: number;
  isServerMessage: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  sender,
  timestamp,
  isServerMessage,
}) => {
  const formattedTime = formatDistanceToNow(new Date(timestamp * 1000), {
    addSuffix: true,
  });

  return (
    <div className={`flex ${isServerMessage ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className="flex flex-col">
        <div className={`message-bubble ${isServerMessage ? 'server-message' : 'user-message'}`}>
          <p>{content}</p>
        </div>
        <div className={`text-xs mt-1 ${isServerMessage ? 'text-left' : 'text-right'} text-gray-500`}>
          {sender} • {formattedTime}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble; 