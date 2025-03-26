import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { SharedDataRepository } from '../../../data/models/SharedData';
import { SharedData } from '../../../types/shared-data';
import url from 'url';

// Constants
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'shared_data');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { dataId } = req.query;
  
  if (!dataId || typeof dataId !== 'string') {
    return res.status(400).json({ error: 'Data ID is required' });
  }
  
  try {
    // Use the SharedDataRepository to get the data metadata from MongoDB
    const sharedDataRepo = new SharedDataRepository();
    const dataMetadata = await sharedDataRepo.getDataById(dataId);
    
    if (!dataMetadata) {
      // Fallback to in-memory store for backward compatibility
      const sharedDataStore = (global as any).sharedDataStore as Map<string, SharedData>;
      
      if (!sharedDataStore || !sharedDataStore.has(dataId)) {
        return res.status(404).json({ error: 'Data not found' });
      }
      
      return res.status(200).json({ data: sharedDataStore.get(dataId) });
    }
    
    // Extract the file name from the stored URL
    const parsedUrl = url.parse(dataMetadata.filePath);
    const fileName = path.basename(parsedUrl.pathname || '');
    
    // Get the actual file path on the server
    const localFilePath = path.join(DATA_DIR, fileName);
    
    // Check if the file exists
    if (!fs.existsSync(localFilePath)) {
      return res.status(404).json({ error: 'Data file not found' });
    }
    
    // For image or binary content, just return metadata
    if (dataMetadata.type === 'image' || dataMetadata.type === 'document') {
      return res.status(200).json({
        data: {
          id: dataMetadata.dataId,
          type: dataMetadata.type,
          content: '', // Empty content for binary files
          filePath: dataMetadata.filePath, // Return the full URL
          timestamp: dataMetadata.timestamp,
          senderId: dataMetadata.senderId,
          metadata: dataMetadata.metadata
        }
      });
    }
    
    // For text-based content, read and return the content
    const content = await fsPromises.readFile(localFilePath, 'utf8');
    
    return res.status(200).json({
      data: {
        id: dataMetadata.dataId,
        type: dataMetadata.type,
        content,
        filePath: dataMetadata.filePath,
        timestamp: dataMetadata.timestamp,
        senderId: dataMetadata.senderId,
        metadata: dataMetadata.metadata
      }
    });
  } catch (error: any) {
    console.error('Error retrieving data:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
} 