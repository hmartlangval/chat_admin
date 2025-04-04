import { NextApiRequest, NextApiResponse } from 'next';
import { FileAccessManager } from '@lib/file_access_manager';
import path from 'path';
import fs from 'fs';

const BASE_DIR = path.join(process.cwd(), 'data', 'prompts');
const fileManager = new FileAccessManager();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET':
                // Handle file list and file content requests
                if (req.query.filename) {
                    // Get file content
                    const filePath = path.join(BASE_DIR, req.query.filename as string);
                    const content = fileManager.readFile(filePath);
                    return res.status(200).json({ content });
                } else {
                    // Get file list
                    const files = fileManager.getFilenames(BASE_DIR);
                    return res.status(200).json({ files });
                }

            case 'POST':
                // Handle file upload/update
                if (!req.body.filename || !req.body.content) {
                    return res.status(400).json({ error: 'Filename and content are required' });
                }
                const uploadPath = path.join(BASE_DIR, req.body.filename);
                fileManager.writeFile(uploadPath, req.body.content);
                return res.status(200).json({ message: 'File uploaded successfully' });

            case 'DELETE':
                // Handle file deletion
                if (!req.query.filename) {
                    return res.status(400).json({ error: 'Filename is required' });
                }
                const deletePath = path.join(BASE_DIR, req.query.filename as string);
                if (!fileManager.fileExists(deletePath)) {
                    return res.status(404).json({ error: 'File not found' });
                }
                fs.unlinkSync(deletePath);
                return res.status(200).json({ message: 'File deleted successfully' });

            default:
                res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
                res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
} 