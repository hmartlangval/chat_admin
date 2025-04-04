import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

// Normalize the path for Windows
const basePath = process.env.DIRECTORY_BROWSING_PATH 
  ? process.env.DIRECTORY_BROWSING_PATH.replace(/\//g, '\\')
  : '';

// Base URL for static files served by IIS
const staticFileBaseUrl = process.env.STATIC_FILE_BASE_URL || '';

// Function to calculate directory size recursively
const calculateDirectorySize = (dirPath: string): number => {
  let totalSize = 0;
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      totalSize += calculateDirectorySize(itemPath);
    } else {
      totalSize += stats.size;
    }
  }
  
  return totalSize;
};

// Function to count items in a directory
const countDirectoryItems = (dirPath: string): number => {
  const items = fs.readdirSync(dirPath);
  return items.length;
};

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
  url?: string;
  itemCount?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { path: filePath, download, zip } = req.query;

    // Validate base path
    if (!basePath) {
      return res.status(500).json({ error: 'DIRECTORY_BROWSING_PATH is not configured' });
    }

    // Ensure base path exists
    if (!fs.existsSync(basePath)) {
      console.error('Directory not found:', basePath);
      return res.status(500).json({ 
        error: 'Configured directory does not exist',
        path: basePath 
      });
    }

    try {
      if (download) {
        // Download file
        const fullPath = path.join(basePath, filePath as string);
        if (!fs.existsSync(fullPath)) {
          return res.status(404).json({ error: 'File not found' });
        }
        const fileStream = fs.createReadStream(fullPath);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(fullPath)}"`);
        fileStream.pipe(res);
      } else if (zip) {
        // Download directory as zip
        const fullPath = path.join(basePath, filePath as string);
        if (!fs.existsSync(fullPath)) {
          return res.status(404).json({ error: 'Directory not found' });
        }
        const zip = new JSZip();
        
        const addFilesToZip = (dirPath: string, zip: JSZip) => {
          const files = fs.readdirSync(dirPath);
          files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isDirectory()) {
              const dir = zip.folder(file);
              if (dir) {
                addFilesToZip(filePath, dir);
              }
            } else {
              zip.file(file, fs.readFileSync(filePath));
            }
          });
        };

        addFilesToZip(fullPath, zip);
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(fullPath)}.zip"`);
        res.send(zipBuffer);
      } else if (!filePath) {
        // List root directory contents
        const items = fs.readdirSync(basePath);
        
        // const staticFileBaseUrl = req.headers.host?.includes('localhost') ? '' : '/static';
        const result: FileItem[] = items.map(item => {
          const itemPath = path.join(basePath, item);
          const stats = fs.statSync(itemPath);
          const url = !stats.isDirectory() ? `${staticFileBaseUrl}/${item}` : undefined;
          const size = stats.isDirectory() ? calculateDirectorySize(itemPath) : stats.size;
          
          return {
            name: item,
            path: item,
            isDirectory: stats.isDirectory(),
            size,
            modified: stats.mtime,
            url,
            itemCount: stats.isDirectory() ? countDirectoryItems(itemPath) : undefined
          };
        });

        // Sort by directory first, then by modified date
        result.sort((a, b) => {
          // First sort by directory (directories come first)
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          
          // Then sort by modified date (newest first)
          return b.modified.getTime() - a.modified.getTime();
        });

        return res.status(200).json(result);
      } else {
        // List directory contents
        const fullPath = path.join(basePath, filePath as string);
        if (!fs.existsSync(fullPath)) {
          return res.status(404).json({ error: 'Directory not found' });
        }
        const items = fs.readdirSync(fullPath);
        
        const staticFileBaseUrl = req.headers.host?.includes('localhost') ? '' : '/static';

        const result: FileItem[] = items.map(item => {
          const itemPath = path.join(fullPath, item);
          const stats = fs.statSync(itemPath);
          const url = !stats.isDirectory() ? `${staticFileBaseUrl}/${filePath}/${item}` : undefined;
          const size = stats.isDirectory() ? calculateDirectorySize(itemPath) : stats.size;
          
          return {
            name: item,
            path: path.join(filePath as string, item),
            isDirectory: stats.isDirectory(),
            size,
            modified: stats.mtime,
            url,
            itemCount: stats.isDirectory() ? countDirectoryItems(itemPath) : undefined
          };
        });

        // Sort by directory first, then by modified date
        result.sort((a, b) => {
          // First sort by directory (directories come first)
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          
          // Then sort by modified date (newest first)
          return b.modified.getTime() - a.modified.getTime();
        });

        return res.status(200).json(result);
      }
    } catch (error) {
      console.error('File system error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 