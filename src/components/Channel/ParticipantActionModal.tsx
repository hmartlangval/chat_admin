import React, { useEffect } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import axios from 'axios';

interface ParticipantActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: {
    id: string;
    name: string;
    type: string;
    window_hwnd?: number;
    commands?: Record<string, string | undefined>;
  } | null;
}

const ParticipantActionModal: React.FC<ParticipantActionModalProps> = ({
  isOpen,
  onClose,
  participant,
}) => {
  // const { activeChannel, isConnected } = useWebSocket();
  const activeChannel = "general"

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !participant) return null;

  const notifyInChannel = async (message: string) => {
    if (!participant) return;

    try {
      const messageContent = {
        channelId: activeChannel,
        content: message,
        senderId: 'system',
        senderName: 'System',
      };

      await fetch(`/api/channels/${activeChannel}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageContent),
      });
    } catch { }
  }

  const handleCancel = async () => {
    if (!participant) return;

    try {
      // Use fetch to send the control command through the API
      const response = await fetch(`/api/channels/${activeChannel}/controlCommand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetId: participant.id,
          command: 'cancel'
        }),
      });

      if (response.ok) {
        console.log(`Cancel command sent to ${participant.name}`);
        await notifyInChannel(`${participant.name} task has been cancelled`);
        onClose();
      } else {
        console.error('Failed to send cancel command');
      }
    } catch (error) {
      console.error('Error sending cancel command:', error);
    }
  };

  const handleStartNext = async () => {
    if (!participant) return;

    try {
      const response = await axios.post(`/api/v2/sendMessage?channelId=${activeChannel}`, {
        content: `@${participant.id} Start Next Message [json]${JSON.stringify({ action_type: 'start' })}[/json]`
      });
      console.log('Start Next Message sent to channel general.');

      if (onClose) onClose()
        
    } catch (error) {
      console.error('Error sending message:', error);
    }

  };

  const isBot = participant.type === 'task_bot';
  const hasWindowHandle = !!participant.window_hwnd;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-xs w-full p-3">
        {/* Header - Name and Type in single row */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <h3 className="text-sm font-medium mr-2">{participant.name}</h3>
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
              {participant.type}
            </span>
          </div>
          <button
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Window Handle */}
        {hasWindowHandle && (
          <div className="text-xs mb-3">
            <span className="inline-flex items-center bg-gray-100 px-2 py-0.5 rounded">
              <span className="font-medium text-gray-500 mr-1">HWND:</span>
              <span>{participant.window_hwnd}</span>
            </span>
          </div>
        )}

        {/* Actions Section */}
        <div className="mt-2 pt-2 border-t border-gray-100">
          <h4 className="text-xs font-medium text-gray-500 mb-1.5">Actions</h4>
          {isBot ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleStartNext}
                className="px-3 py-1 bg-green-500 text-white hover:bg-green-700 text-xs rounded-md transition-colors font-medium"
              >
                Start Next Task
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 bg-red-300 text-black-600 hover:bg-red-200 text-xs rounded-md transition-colors font-medium"
              >
                Cancel Task
              </button>
            </div>

          ) : (
            <div className="text-xs text-gray-500 italic">No actions available</div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ParticipantActionModal; 