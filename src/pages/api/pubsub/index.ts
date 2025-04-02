import { NextApiRequest, NextApiResponse } from 'next';
import { PubSub, PubSubRecord } from '../../../data/models/PubSub';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const pubsub = new PubSub();
    
    if (req.method === 'GET') {
      // Get the specific queue type from the query params
      const { type } = req.query;
      
      if (type === 'prop') {
        // Get active prop records in order they were created (FIFO)
        const records = await pubsub.getActiveProp();
        return res.status(200).json({ records });
      } else if (type === 'tax') {
        // Get active tax records in order they were created (FIFO)
        const records = await pubsub.getActiveTax();
        return res.status(200).json({ records });
      } else {
        // Default: return all pubsub records
        const records = await pubsub.getAll();
        return res.status(200).json({ records });
      }
    } else if (req.method === 'POST') {
      // Create a new pubsub record
      const data: Partial<PubSubRecord> = req.body;
      
      if (!data || !data.id) {
        return res.status(400).json({ error: 'Missing required id field' });
      }
      
      const created = await pubsub.create(data);
      return res.status(201).json({ record: created });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('PubSub API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
