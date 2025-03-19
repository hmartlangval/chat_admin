import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ChannelControlsProps {
  onChannelStatusChange: (isActive: boolean) => void;
  onClearMessages: () => void;
}

const ChannelControls: React.FC<ChannelControlsProps> = ({ 
  onChannelStatusChange,
  onClearMessages
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check initial channel status
  useEffect(() => {
    const checkChannelStatus = async () => {
      try {
        const response = await axios.get('http://localhost:8000/channel/status');
        setIsActive(response.data.is_active);
        onChannelStatusChange(response.data.is_active);
      } catch (error) {
        // It's okay if this fails initially (no channel exists yet)
        setIsActive(false);
        onChannelStatusChange(false);
      }
    };

    checkChannelStatus();
  }, [onChannelStatusChange]);

  const handleStartChannel = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Set a timeout for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      await axios.post('http://localhost:8000/channel/start', {}, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      setIsActive(true);
      onChannelStatusChange(true);
      onClearMessages(); // Clear messages when starting channel
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        setError('Request timed out. The server might be unresponsive.');
      } else if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        setError(`Server error: ${error.response.status} - ${error.response.data.detail || 'Unknown error'}`);
      } else if (error.request) {
        // The request was made but no response was received
        setError('No response from server. Please check if the backend is running.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError(`Error: ${error.message || 'Unknown error'}`);
      }
      console.error('Error starting channel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopChannel = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Set a timeout for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      await axios.post('http://localhost:8000/channel/stop', {}, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      setIsActive(false);
      onChannelStatusChange(false);
      onClearMessages(); // Clear messages when stopping channel
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        setError('Request timed out. The server might be unresponsive.');
      } else if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        setError(`Server error: ${error.response.status} - ${error.response.data.detail || 'Unknown error'}`);
      } else if (error.request) {
        // The request was made but no response was received
        setError('No response from server. Please check if the backend is running.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError(`Error: ${error.message || 'Unknown error'}`);
      }
      console.error('Error stopping channel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow">
        <div className="flex items-center">
          <div 
            className={`w-3 h-3 rounded-full mr-2 ${isActive ? 'bg-green-500' : 'bg-red-500'}`} 
          />
          <span className="font-medium">
            Channel Status: {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <button
          onClick={isActive ? handleStopChannel : handleStartChannel}
          disabled={isLoading}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isActive 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-primary-500 hover:bg-primary-600'
          } disabled:opacity-50 transition-colors`}
        >
          {isLoading ? 'Processing...' : isActive ? 'Stop Channel' : 'Start Channel'}
        </button>
      </div>
      
      {error && (
        <div className="p-2 bg-red-100 text-red-800 rounded-md text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default ChannelControls; 