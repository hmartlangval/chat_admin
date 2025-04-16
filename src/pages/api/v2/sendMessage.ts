import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import type { Server as NetServer } from 'http';
import { processMessage } from '@utils/messageProcessor';
import { ISocketClients } from '../socket';

// Define the extended response type
type ExtendedNextApiResponse = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
      clients?: Map<string, ISocketClients>
    };
  };
};

// The message repository instance is now created and managed within messageProcessor.ts
// const messageRepository = new MessageRepository();

export default async function handler(
  req: NextApiRequest,
  res: ExtendedNextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { channelId } = req.query;
  const { content, sender = 'Admin', senderId = 'admin', isPrivate = false, recipients = [] } = req.body;

  if (!isPrivate) {
    if (!channelId || typeof channelId !== 'string') {
      return res.status(400).json({ error: 'Channel ID is required' });
    }
  }

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const io = res.socket?.server?.io;
  const clients = res.socket?.server?.clients;

  if (!io) {
    return res.status(400).json({
      error: 'Socket.IO server not initialized',
      message: 'Please initialize the server from the admin page first'
    });
  }

  try {

    if (!isPrivate) {
      const channelsMap = (global as any).channels;

      if (!channelsMap || !channelsMap.has(channelId)) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const channel = channelsMap.get(channelId);

      if (!channel.active) {
        return res.status(400).json({ error: 'Cannot send message to inactive channel' });
      }

      // Use the unified message processing function
      const message = await processMessage(
        channelId as string,
        content,
        senderId ?? 'admin',
        sender,
        'admin',
        channel,
        'rest-api'
      );

      // Emit the message to the channel
      io.to(`channel:${channelId}`).emit('new_message', message);
      return res.status(200).json({ success: true, message });
    } else {
      const message = content
      console.log("PRINTING PRINTING: ", clients)

      if(!clients)
        return res.status(200).json({ success: false, message: "No clients registered in server" });
      // Emit the message to the channel
      const targetClients = Array.from(clients.values()).filter(client => recipients.includes(client.botId || ''));
        targetClients.forEach(client => {
          io.to(client.id).emit('private-message', {
            senderId,
            msg_type: 'status-check',
            data: {},
            timestamp: Date.now()
          });
        });
      
      return res.status(200).json({ message: 'status-check sent' });
    }

  } catch (error: any) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
} 