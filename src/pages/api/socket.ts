import { Server as SocketIOServer } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as NetServer } from 'http';
import type { Socket } from 'socket.io';

// Augment the response type to include custom socket properties
type SocketIONextApiResponse = NextApiResponse & {
  socket: any & {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

// Define participant type
interface Participant {
  id: string;
  name: string;
  type: string;
}

// Define message type
interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderType: string;
  content: string;
  tags: string[];
  timestamp: number;
}

// Define channel type
interface Channel {
  participants: Set<Participant>;
  active: boolean;
  messages: ChatMessage[];
}

// Global variable to store Socket.IO server instance
let io: SocketIOServer;

// Global channels map
const channels = new Map<string, Channel>();
// Make channels available globally
(global as any).channels = channels;

export default function handler(req: NextApiRequest, res: SocketIONextApiResponse) {
  if (res.socket.server.io) {
    // If the Socket.IO server is already running, just return success
    console.log('Socket server already running');
    res.status(200).json({ message: 'Socket.IO server already running' });
    return;
  }

  try {
    console.log('Setting up Socket.IO server...');
    
    // Configure Socket.IO with generous CORS settings
    io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['*'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
    });
    
    // Store the io instance on the server object
    res.socket.server.io = io;

    io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);
      
      // Bot registration
      socket.on('register', (data: { botId: string; name: string; type?: string }) => {
        console.log('Bot registered:', data);
        socket.data.botId = data.botId;
        socket.data.name = data.name;
        socket.data.type = data.type || 'bot';
        
        // Broadcast to all clients that a new bot is available
        io.emit('bot_registered', {
          botId: data.botId,
          name: data.name,
          type: data.type || 'bot'
        });
      });

      // Join channel
      socket.on('join_channel', (channelId: string) => {
        console.log(`${socket.data.name || socket.id} joining channel: ${channelId}`);
        socket.join(`channel:${channelId}`);
        
        // Get channel or create if doesn't exist
        if (!channels.has(channelId)) {
          console.log(`Creating new channel: ${channelId}`);
          channels.set(channelId, { 
            participants: new Set<Participant>(),
            active: true, // Set to active by default when created
            messages: []
          });
        }
        
        const channel = channels.get(channelId);
        if (channel) {
          const participant: Participant = {
            id: socket.data.botId || socket.id,
            name: socket.data.name || 'Anonymous',
            type: socket.data.type || 'user'
          };
          
          channel.participants.add(participant);
          
          // Notify all participants in the channel
          io.to(`channel:${channelId}`).emit('participant_joined', {
            participantId: socket.data.botId || socket.id,
            name: socket.data.name || 'Anonymous',
            type: socket.data.type || 'user',
            timestamp: Date.now()
          });
          
          // Notify the client about the channel status
          socket.emit('channel_status', {
            channelId,
            active: channel.active,
            participants: Array.from(channel.participants),
            timestamp: Date.now()
          });
        }
      });

      // Leave channel
      socket.on('leave_channel', (channelId: string) => {
        console.log(`${socket.data.name || socket.id} leaving channel: ${channelId}`);
        socket.leave(`channel:${channelId}`);
        
        const channel = channels.get(channelId);
        if (channel) {
          // Remove participant from the channel
          channel.participants.forEach((participant: Participant) => {
            if (participant.id === (socket.data.botId || socket.id)) {
              channel.participants.delete(participant);
            }
          });
          
          // Notify all participants in the channel
          io.to(`channel:${channelId}`).emit('participant_left', {
            participantId: socket.data.botId || socket.id,
            name: socket.data.name || 'Anonymous',
            timestamp: Date.now()
          });
        }
      });

      // Chat message
      socket.on('message', (message: { channelId: string; content: string }) => {
        console.log(`Message from ${socket.data.name || socket.id}:`, message.content);
        
        const channelId = message.channelId;
        let channel = channels.get(channelId);
        
        // Automatically create and activate the channel if it doesn't exist
        if (!channel) {
          console.log(`Auto-creating channel for message: ${channelId}`);
          channel = { 
            participants: new Set<Participant>(),
            active: true,
            messages: []
          };
          channels.set(channelId, channel);
          
          // Make sure the sender is in the channel
          const participant: Participant = {
            id: socket.data.botId || socket.id,
            name: socket.data.name || 'Anonymous',
            type: socket.data.type || 'user'
          };
          channel.participants.add(participant);
        }
        
        // Auto-activate the channel if inactive but has a message
        if (!channel.active) {
          console.log(`Auto-activating inactive channel: ${channelId}`);
          channel.active = true;
          
          // Notify participants that the channel is now active
          io.to(`channel:${channelId}`).emit('channel_started', {
            channelId,
            timestamp: Date.now()
          });
        }
        
        // Process any tags in the message (format: @participant_id)
        const tags: string[] = [];
        if (message.content) {
          const tagMatches = message.content.match(/@(\w+)/g);
          if (tagMatches) {
            tagMatches.forEach((tag: string) => {
              tags.push(tag.substring(1)); // Remove the @ symbol
            });
          }
        }
        
        // Enrich message with sender info and timestamp
        const enrichedMessage: ChatMessage = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
          channelId,
          senderId: socket.data.botId || socket.id,
          senderName: socket.data.name || 'Anonymous',
          senderType: socket.data.type || 'user',
          content: message.content,
          tags,
          timestamp: Date.now()
        };
        
        // Save message to channel history
        channel.messages.push(enrichedMessage);
        
        // Broadcast to all in the channel
        io.to(`channel:${channelId}`).emit('new_message', enrichedMessage);
      });

      // Channel operations
      socket.on('start_channel', (channelId: string) => {
        console.log(`Starting channel: ${channelId}`);
        
        if (!channels.has(channelId)) {
          channels.set(channelId, { 
            participants: new Set<Participant>(),
            active: true,
            messages: []
          });
        } else {
          const channel = channels.get(channelId);
          if (channel) {
            channel.active = true;
            // Clear messages when restarting
            channel.messages = [];
          }
        }
        
        io.to(`channel:${channelId}`).emit('channel_started', {
          channelId,
          timestamp: Date.now()
        });
      });

      socket.on('stop_channel', (channelId: string) => {
        console.log(`Stopping channel: ${channelId}`);
        
        if (channels.has(channelId)) {
          const channel = channels.get(channelId);
          if (channel) {
            channel.active = false;
            
            io.to(`channel:${channelId}`).emit('channel_stopped', {
              channelId,
              timestamp: Date.now()
            });
          }
        }
      });

      // Get channel details
      socket.on('get_channel_details', (channelId: string, callback: (data: any) => void) => {
        const channel = channels.get(channelId);
        
        if (channel) {
          callback({
            channelId,
            active: channel.active,
            participants: Array.from(channel.participants),
            messageCount: channel.messages.length
          });
        } else {
          callback({
            channelId,
            active: false,
            participants: [],
            messageCount: 0,
            error: 'Channel not found'
          });
        }
      });

      // Get channel messages
      socket.on('get_channel_messages', (channelId: string, callback: (data: any) => void) => {
        const channel = channels.get(channelId);
        
        if (channel) {
          callback({
            channelId,
            messages: channel.messages
          });
        } else {
          callback({
            channelId,
            messages: [],
            error: 'Channel not found'
          });
        }
      });

      // Disconnect handling
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Handle any cleanup needed
        channels.forEach((channel, channelId) => {
          // Check if this participant is in the channel
          let participantFound = false;
          
          channel.participants.forEach((participant: Participant) => {
            if (participant.id === (socket.data.botId || socket.id)) {
              channel.participants.delete(participant);
              participantFound = true;
            }
          });
          
          if (participantFound) {
            io.to(`channel:${channelId}`).emit('participant_left', {
              participantId: socket.data.botId || socket.id,
              name: socket.data.name || 'Anonymous',
              timestamp: Date.now()
            });
          }
        });
      });

      // Error handling
      socket.on('error', (error: any) => {
        console.error('Socket error:', error);
      });
    });
    
    console.log('Socket.IO server started');
    res.status(200).json({ message: 'Socket.IO server initialized' });
  } catch (error: any) {
    console.error('Failed to start Socket.IO server:', error);
    res.status(500).json({ error: `Failed to start Socket.IO server: ${error.message || 'Unknown error'}` });
  }
} 