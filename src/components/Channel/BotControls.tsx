import React, { useState } from 'react';
import axios from 'axios';

interface BotControlsProps {
  participantId: string;
  botName: string;
  isChannelActive: boolean;
}

const BotControls: React.FC<BotControlsProps> = ({ 
  participantId,
  botName,
  isChannelActive 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLeft, setHasLeft] = useState(false);

  const handleLeaveChannel = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Set a timeout for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Use the new generic endpoint with participant_id as a query parameter
      await axios.post(`http://localhost:8000/channel/leave?participant_id=${participantId}`, {}, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      setHasLeft(true);
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        setError('Request timed out. The server might be unresponsive.');
      } else if (error.response) {
        setError(`Server error: ${error.response.status} - ${error.response.data.detail || 'Unknown error'}`);
      } else if (error.request) {
        setError('No response from server. Please check if the backend is running.');
      } else {
        setError(`Error: ${error.message || 'Unknown error'}`);
      }
      console.error(`Error making ${botName} leave channel:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinChannel = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Set a timeout for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Use the new generic endpoint with participant_id as a query parameter
      await axios.post(`http://localhost:8000/channel/join?participant_id=${participantId}`, {}, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      setHasLeft(false);
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        setError('Request timed out. The server might be unresponsive.');
      } else if (error.response) {
        setError(`Server error: ${error.response.status} - ${error.response.data.detail || 'Unknown error'}`);
      } else if (error.request) {
        setError('No response from server. Please check if the backend is running.');
      } else {
        setError(`Error: ${error.message || 'Unknown error'}`);
      }
      console.error(`Error making ${botName} join channel:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{botName} Bot</h2>
        
        {isChannelActive && (
          <button
            onClick={hasLeft ? handleJoinChannel : handleLeaveChannel}
            disabled={isLoading}
            className={`px-3 py-1 rounded-md text-white text-sm font-medium ${
              hasLeft 
                ? 'bg-primary-500 hover:bg-primary-600' 
                : 'bg-red-500 hover:bg-red-600'
            } disabled:opacity-50 transition-colors`}
          >
            {isLoading ? 'Processing...' : hasLeft ? 'Join Channel' : 'Leave Channel'}
          </button>
        )}
      </div>
      
      <div className="flex items-center mb-2">
        <div 
          className={`w-3 h-3 rounded-full mr-2 ${
            isChannelActive && !hasLeft ? 'bg-green-500' : 'bg-red-500'
          }`} 
        />
        <span className="text-sm">
          Status: {isChannelActive && !hasLeft ? 'Active' : 'Inactive'}
        </span>
      </div>
      
      {error && (
        <div className="p-2 bg-red-100 text-red-800 rounded-md text-sm mt-2">
          {error}
        </div>
      )}
    </div>
  );
};

export default BotControls; 