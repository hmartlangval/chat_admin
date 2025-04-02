import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ParticipantActionModal from './ParticipantActionModal';

interface Participant {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  window_hwnd?: number;
  commands?: Record<string, string | undefined>;
}

interface ParticipantsListProps {
  isChannelActive: boolean;
  onRefresh?: () => void;
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({ 
  isChannelActive,
  onRefresh
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [channelParticipants, setChannelParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all available participants
  const fetchParticipants = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('http://localhost:8000/participants');
      setParticipants(response.data);
    } catch (error: any) {
      console.error('Error fetching participants:', error);
      setError('Failed to fetch participants');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch participants in the channel
  const fetchChannelParticipants = async () => {
    if (!isChannelActive) {
      setChannelParticipants([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('http://localhost:8000/channel/participants');
      setChannelParticipants(response.data);
    } catch (error: any) {
      console.error('Error fetching channel participants:', error);
      setError('Failed to fetch channel participants');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on component mount and when channel status changes
  useEffect(() => {
    fetchParticipants();
    fetchChannelParticipants();
  }, [isChannelActive]);

  // Handle refresh button click
  const handleRefresh = () => {
    fetchParticipants();
    fetchChannelParticipants();
    if (onRefresh) onRefresh();
  };

  // Handle click on a participant
  const handleParticipantClick = (participant: Participant) => {
    setSelectedParticipant(participant);
    setIsModalOpen(true);
  };


  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Participants</h2>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {error && (
        <div className="p-2 bg-red-100 text-red-800 rounded-md text-sm mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-md font-medium mb-2">Available Participants</h3>
        <ul className="space-y-2">
          {participants.map(participant => (
            <li 
              key={participant.id}
              className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-gray-50"
              onClick={() => handleParticipantClick(participant)}
            >
              <div className="flex items-center">
                <div 
                  className={`w-2 h-2 rounded-full mr-2 ${
                    participant.is_active ? 'bg-green-500' : 'bg-red-500'
                  }`} 
                />
                <span>{participant.name}</span>
              </div>
              <span className="text-xs text-gray-500">{participant.type}</span>
            </li>
          ))}
          {participants.length === 0 && !isLoading && (
            <li className="text-gray-500 text-sm">No participants available</li>
          )}
        </ul>
      </div>
      
      {isChannelActive && (
        <div>
          <h3 className="text-md font-medium mb-2">Channel Participants</h3>
          <ul className="space-y-2">
            {channelParticipants.map(participant => (
              <li 
                key={participant.id}
                className="flex items-center justify-between p-2 border rounded bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() => handleParticipantClick(participant)}
              >
                <span>{participant.name}</span>
                <span className="text-xs text-gray-500">{participant.type}</span>
              </li>
            ))}
            {channelParticipants.length === 0 && !isLoading && (
              <li className="text-gray-500 text-sm">No participants in channel</li>
            )}
          </ul>
        </div>
      )}

      {/* Participant Action Modal */}
      <ParticipantActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        participant={selectedParticipant}
      />
    </div>
  );
};

export default ParticipantsList; 