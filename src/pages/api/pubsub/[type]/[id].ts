import { NextApiRequest, NextApiResponse } from 'next';
import { PubSub } from '../../../../data/models/PubSub';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow PUT method for completion
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid ID parameter' });
    }

    if (!type || (type !== 'prop' && type !== 'tax')) {
      return res.status(400).json({ error: 'Invalid type parameter. Must be "prop" or "tax"' });
    }

    const pubsub = new PubSub();
    
    // Mark as completed based on the type
    let updatedRecord = null;
    
    if (type === 'prop') {
      updatedRecord = await pubsub.markPropComplete(id);
    } else if (type === 'tax') {
      updatedRecord = await pubsub.markTaxComplete(id);
    }

    if (!updatedRecord) {
      return res.status(404).json({ error: 'PubSub record not found or update failed' });
    }

    // If the record was removed (both prop and tax are 0), provide different response
    if (updatedRecord.prop === 0 && updatedRecord.tax === 0) {
      return res.status(200).json({ 
        message: 'Task completed and removed from queue',
        record: updatedRecord
      });
    }

    return res.status(200).json({ 
      message: `${type} task marked as completed`,
      record: updatedRecord
    });
  } catch (error: any) {
    console.error('PubSub Update Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 