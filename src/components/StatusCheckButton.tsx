import React, { useState } from 'react';
import { Button } from './UI/button';
import { FileUploadModal } from './FileUploadModal';
import { useWebSocket } from '../contexts/WebSocketContext';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

interface StatusCheckButtonProps {
  className?: string;
  buttonText?: string;
  isChannelActive?: boolean;
}

export function StatusCheckButton({ 
  className = '', 
}: StatusCheckButtonProps) {

  const handleClick = async () => {
    try {
      const response = await axios.post('/api/v2/sendMessage', {
        isPrivate: true,
        recipients: ['ttc', 'fileprep', 'taxbot', 'propertybot'],
        content: "any message"
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
      >
        Check Statuses
      </Button>

    
    </>
  );
} 