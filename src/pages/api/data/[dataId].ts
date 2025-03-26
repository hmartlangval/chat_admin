import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';

interface SharedData {
  id: string;
  type: 'string' | 'image' | 'document' | 'json';
  content: string;
  filePath?: string;
  timestamp: number;
  senderId: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { dataId } = req.query;
  
  if (!dataId || typeof dataId !== 'string') {
    return res.status(400).json({ error: 'Data ID is required' });
  }
  
  try {
    // Access the shared data store
    const sharedDataStore = (global as any).sharedDataStore as Map<string, SharedData>;
    
    if (!sharedDataStore) {
      return res.status(404).json({ error: 'Shared data store not initialized' });
    }
    
    if (!sharedDataStore.has(dataId)) {
      return res.status(404).json({ error: 'Data not found' });
    }
    
    const data = sharedDataStore.get(dataId)!;
    
    // If data has a file path, prioritize reading from the file
    if (data.filePath && fs.existsSync(data.filePath)) {
      // Handle different data types
      switch (data.type) {
        case 'json':
          // For JSON, read the file and return as JSON
          try {
            const fileContent = await fsPromises.readFile(data.filePath, 'utf8');
            data.content = fileContent; // Update in-memory content too
            return res.status(200).json({ 
              data: {
                ...data,
                content: fileContent
              } 
            });
          } catch (err: any) {
            console.error(`Error reading JSON file ${data.filePath}:`, err);
            return res.status(500).json({ error: `Error reading JSON file: ${err.message}` });
          }
          
        case 'image':
          // For images, stream the file directly
          try {
            const stat = await fsPromises.stat(data.filePath);
            const fileExtension = path.extname(data.filePath).toLowerCase();
            let contentType = 'application/octet-stream';
            
            // Determine content type based on file extension
            if (fileExtension === '.png') contentType = 'image/png';
            else if (fileExtension === '.jpg' || fileExtension === '.jpeg') contentType = 'image/jpeg';
            else if (fileExtension === '.gif') contentType = 'image/gif';
            else if (fileExtension === '.webp') contentType = 'image/webp';
            else if (fileExtension === '.svg') contentType = 'image/svg+xml';
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', stat.size);
            
            // Stream the file to the response
            const fileStream = fs.createReadStream(data.filePath);
            return fileStream.pipe(res);
          } catch (err: any) {
            console.error(`Error streaming image file ${data.filePath}:`, err);
            return res.status(500).json({ error: `Error streaming image file: ${err.message}` });
          }
          
        case 'document':
          // Read document as text
          try {
            const fileContent = await fsPromises.readFile(data.filePath, 'utf8');
            data.content = fileContent; // Update in-memory content too
            return res.status(200).json({ 
              data: {
                ...data,
                content: fileContent
              } 
            });
          } catch (err: any) {
            console.error(`Error reading document file ${data.filePath}:`, err);
            return res.status(500).json({ error: `Error reading document file: ${err.message}` });
          }
          
        default:
          // For string and other types, read as text
          try {
            const fileContent = await fsPromises.readFile(data.filePath, 'utf8');
            data.content = fileContent; // Update in-memory content too
            return res.status(200).json({ 
              data: {
                ...data,
                content: fileContent
              } 
            });
          } catch (err: any) {
            console.error(`Error reading text file ${data.filePath}:`, err);
            return res.status(500).json({ error: `Error reading text file: ${err.message}` });
          }
      }
    } else {
      // Fallback to memory-stored content if file doesn't exist
      // This handles both cases: no filePath or file not found
      if (data.filePath && !fs.existsSync(data.filePath)) {
        console.warn(`File not found at ${data.filePath}, using in-memory content`);
      }
      
      return res.status(200).json({ data });
    }
  } catch (error: any) {
    console.error('Error retrieving shared data:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
} 