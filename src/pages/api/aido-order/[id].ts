import { NextApiRequest, NextApiResponse } from 'next';
import { AidoOrderProcessing, AidoOrderRecord } from '../../../data/models/AidoOrderProcessing';
import { ObjectId } from 'mongodb';
import { broadcastAidoRecordUpdated, broadcastAidoRecordDeleted } from '../../../lib/socketServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid record ID' });
  }
  
  // Validate ObjectId format
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid record ID format' });
  }
  
  const aidoOrder = new AidoOrderProcessing();
  
  // GET - Retrieve a specific record
  if (req.method === 'GET') {
    try {
      const records = await aidoOrder.find({ _id: new ObjectId(id) });
      
      if (!records || records.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }
      
      return res.status(200).json({ record: records[0] });
    } catch (error) {
      console.error('Error fetching record:', error);
      return res.status(500).json({ error: 'Failed to fetch record' });
    }
  }
  
  // PUT - Update a record
  if (req.method === 'PUT') {
    try {
      const updateData = req.body as Partial<AidoOrderRecord>;
      
      const updatedRecord = await aidoOrder.update(id, updateData);
      
      if (!updatedRecord) {
        return res.status(404).json({ error: 'Record not found' });
      }
      
      // Broadcast the update to all connected clients
      broadcastAidoRecordUpdated(updatedRecord as AidoOrderRecord);
      
      return res.status(200).json({ record: updatedRecord });
    } catch (error) {
      console.error('Error updating record:', error);
      return res.status(500).json({ error: 'Failed to update record' });
    }
  }
  
  // DELETE - Remove a record
  if (req.method === 'DELETE') {
    try {
      const result = await aidoOrder.delete(id);
      
      if (!result) {
        return res.status(404).json({ error: 'Record not found' });
      }
      
      // Broadcast the deletion to all connected clients
      broadcastAidoRecordDeleted(id as string);
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting record:', error);
      return res.status(500).json({ error: 'Failed to delete record' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
} 