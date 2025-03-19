import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import type { Server as NetServer } from 'http';

// Define the extended response type
type ExtendedNextApiResponse = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

export default function handler(
  req: NextApiRequest,
  res: ExtendedNextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { channelId } = req.query;
  const { content, sender = 'Admin' } = req.body;
  
  if (!channelId || typeof channelId !== 'string') {
    return res.status(400).json({ error: 'Channel ID is required' });
  }
  
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Message content is required' });
  }
  
  const io = res.socket?.server?.io;
  
  if (!io) {
    return res.status(400).json({ 
      error: 'Socket.IO server not initialized',
      message: 'Please initialize the server from the admin page first' 
    });
  }
  
  try {
    // Access the channel data from the Socket.IO server
    const channelsMap = (global as any).channels;
    
    if (!channelsMap || !channelsMap.has(channelId)) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    const channel = channelsMap.get(channelId);
    
    if (!channel.active) {
      return res.status(400).json({ error: 'Cannot send message to inactive channel' });
    }
    
    // Process any tags in the message (format: @participant_id)
    const tags: string[] = [];
    if (content) {
      const tagMatches = content.match(/@(\w+)/g);
      if (tagMatches) {
        tagMatches.forEach((tag: string) => {
          tags.push(tag.substring(1)); // Remove the @ symbol
        });
      }
    }
    
    // Create the message
    const message = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      channelId,
      senderId: 'admin',
      senderName: sender,
      senderType: 'admin',
      content: content,
      tags,
      timestamp: Date.now()
    };
    
    // Save message to channel history
    channel.messages.push(message);
    
    // Emit the message to the channel
    io.to(`channel:${channelId}`).emit('new_message', message);
    
    return res.status(200).json({ success: true, message });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
} 