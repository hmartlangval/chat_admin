import { Server } from 'socket.io';
import { AidoOrderRecord } from '../data/models/AidoOrderProcessing';

// Singleton Socket.IO server reference
let io: Server | null = null;

export function setSocketServer(socketServer: Server) {
  io = socketServer;
}

export function getSocketServer() {
  return io;
}

// Utility function to broadcast events to all clients or specific channels
export function broadcastEvent(event: string, data: any, channel?: string) {
  if (!io) return false;
  
  if (channel) {
    io.to(channel).emit(event, data);
  } else {
    io.emit(event, data);
  }
  
  return true;
}

// Specialized functions for AidoOrderRecord operations
export function broadcastAidoRecordUpdated(record: AidoOrderRecord, channel?: string) {
  return broadcastEvent('aido_record_updated', {
    record,
    updatedAt: new Date()
  }, channel);
}

export function broadcastAidoRecordDeleted(id: string, channel?: string) {
  return broadcastEvent('aido_record_deleted', {
    id,
    deletedAt: new Date()
  }, channel);
}

export function broadcastAidoRecordCreated(record: AidoOrderRecord, channel?: string) {
  return broadcastEvent('aido_record_created', {
    record,
    createdAt: new Date()
  }, channel);
} 