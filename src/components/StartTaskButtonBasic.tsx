import React, { useState } from 'react';
import { Button } from './UI/button';
import { FileUploadModal } from './FileUploadModal';
import { useWebSocket } from '../contexts/WebSocketContext';
import dotenv from 'dotenv';

dotenv.config();

interface StartTaskButtonProps {
  className?: string;
  buttonText?: string;
  isChannelActive?: boolean;
}

export function StartTaskButtonBasic({ 
  className = '', 
  buttonText = 'Start New Task',
  isChannelActive = false
}: StartTaskButtonProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { sendMessage } = useWebSocket();

  const handleUploadComplete = async (records: any[]) => {
    setIsProcessing(true);
    try {

      console.log('upload completed handling the same.....')
      console.log(window.location.origin)
      const messageContent = {
        action: "start_local_pdf",
        data: records.map(record => ({
          pdf_path: `${window.location.origin}${record.url}`,
          original_filename: record.original_filename,
          file_type: record.file_type,
          id: record.id,
        }))
      };

      console.log('messageContent', messageContent);

      // Send the message using WebSocket
      sendMessage(`@fileprep process this message [json]${JSON.stringify(messageContent)}[/json]`);

      // Close the modal after sending message
      setIsUploadModalOpen(false);
    } catch (error) {
      console.error('Error in task workflow:', error);
      alert('Error processing file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsUploadModalOpen(true)}
        className={className}
        disabled={isProcessing || !isChannelActive}
      >
        {isProcessing ? 'Processing...' : !isChannelActive ? 'Channel Inactive' : buttonText}
      </Button>

      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
        title="Upload PDF File"
        folderPath="aido_order_files"
        maxFileSize={process.env.NEXT_PUBLIC_FILE_UPLOAD_MAX_SIZE_MB ? parseInt(process.env.NEXT_PUBLIC_FILE_UPLOAD_MAX_SIZE_MB) * 1024 * 1024 : 5 * 1024 * 1024}
        allowedTypes={['application/pdf']}
        multiple={false}
      />
    </>
  );
} 