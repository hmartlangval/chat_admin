import React from 'react';
import { Button } from './UI/button';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface DeveloperTestingButtonProps {
  className?: string;
  buttonText?: string;
  isChannelActive?: boolean;
  message?: string;
}

export function DeveloperTestingButton({ 
  className = '', 
  isChannelActive = false,
  buttonText = 'Send Test Message',
  message = '@pmtestsender send a private message'
}: DeveloperTestingButtonProps) {

  const handleClick = async () => {
    try {
      const response = await axios.post('/api/channels/general/sendMessage', {
        channelId: 'general',
        content: message
      });
      console.log('Message sent to channel general.');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <>
      <Button 
        onClick={handleClick}
        className={className}
        disabled={!isChannelActive}
      >
        {buttonText}
      </Button>
    </>
  );
} 