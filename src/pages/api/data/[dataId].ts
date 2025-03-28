import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { SharedDataRepository } from '../../../data/models/SharedData';
import { SharedData } from '../../../types/shared-data';
import url from 'url';
import { FILE_UPLOAD_CONFIG } from '../../../config/file-upload';

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

    // Check if this is a file upload (has filePath starting with /api/data/)
    if (dataMetadata.filePath?.startsWith('/api/data/')) {
      // Extract the file name from the stored URL
      const parsedUrl = url.parse(dataMetadata.filePath);
      const fileName = path.basename(parsedUrl.pathname || '');
      
      // Search for the file in all upload folders
      const baseUploadDir = path.join(process.cwd(), FILE_UPLOAD_CONFIG.baseUploadFolder);
      const folders = fs.readdirSync(baseUploadDir);
      
      let filePath = null;
      for (const folder of folders) {
        const fullPath = path.join(baseUploadDir, folder, fileName);
        if (fs.existsSync(fullPath)) {
          filePath = fullPath;
          break;
        }
      }

      if (!filePath) {
        return res.status(404).json({ error: 'Data file not found' });
      }
      
      // For image or binary content, stream the file
      if (dataMetadata.type === 'image' || dataMetadata.type === 'document') {
        // Get file stats
        const stats = fs.statSync(filePath);
        
        // Set appropriate headers
        res.setHeader('Content-Type', dataMetadata.metadata?.contentType || 'application/octet-stream');
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        // Handle errors
        fileStream.on('error', (error) => {
          console.error('Error streaming file:', error);
          res.status(500).json({ error: 'Error streaming file' });
        });

        return;
      }
    }
    
    // For non-file data or text-based content, use the original logic
    const localFilePath = path.join(DATA_DIR, dataId);
    
    // Check if the file exists
    if (!fs.existsSync(localFilePath)) {
      return res.status(404).json({ error: 'Data file not found' });
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