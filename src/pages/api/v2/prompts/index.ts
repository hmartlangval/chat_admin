import { NextApiRequest, NextApiResponse } from 'next';
import { FileAccessManager } from '@lib/file_access_manager';
import path from 'path';
import fs from 'fs';

const BASE_DIR = process.env.PROMPTS_DIR_PATH || ""; // || path.join(process.cwd(), 'data', 'prompts');
const fileManager = new FileAccessManager(BASE_DIR, '');

interface PromptFile {
    name: string;
    path: string;
    type: 'system' | 'instruction' | 'custom';
}

interface FolderContent {
    folder: string;
    prompts: PromptFile[];
}

// Ensure the base directory exists
// if (!fs.existsSync(BASE_DIR)) {
//     fs.mkdirSync(BASE_DIR, { recursive: true });
// }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    if (!BASE_DIR) {
        return res.status(404).json({ error: 'Prompts directory not defined' });
    }

    try {
        switch (method) {
            case 'GET':
                if (req.query.folder && req.query.filename) {
                    // Get specific file content
                    const filePath = path.join(BASE_DIR, req.query.folder as string, req.query.filename as string);
                    if (!fileManager.fileExists(filePath)) {
                        return res.status(404).json({ error: 'File not found' });
                    }
                    const content = fileManager.readFile(filePath);
                    return res.status(200).json({ content });
                } else if (req.query.folder) {
                    // Get all prompts in a folder
                    const folderPath = path.join(BASE_DIR, req.query.folder as string);
                    
                    // Ensure folder exists
                    if (!fs.existsSync(folderPath)) {
                        fs.mkdirSync(folderPath, { recursive: true });
                    }

                    const files = fileManager.getFilenames(folderPath) || [];
                    
                    const prompts: PromptFile[] = files.map(file => {
                        const isSystem = file === 'system_prompt.md';
                        const isInstruction = file === 'instructions.md';
                        return {
                            name: file,
                            path: path.join(req.query.folder as string, file),
                            type: isSystem ? 'system' : isInstruction ? 'instruction' : 'custom'
                        };
                    });

                    return res.status(200).json({ prompts });
                } else {
                    // Get all folders and their default prompts
                    const folders = fileManager.getFilenames(BASE_DIR)
                        .filter(name => {
                            const fullPath = path.join(BASE_DIR, name);
                            return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
                        });

                    const folderContents: FolderContent[] = folders.map(folder => {
                        const folderPath = path.join(BASE_DIR, folder);
                        const files = fileManager.getFilenames(folderPath) || [];
                        
                        const prompts: PromptFile[] = files.map(file => {
                            const isSystem = file === 'system_prompt.md';
                            const isInstruction = file === 'instructions.md';
                            return {
                                name: file,
                                path: path.join(folder, file),
                                type: isSystem ? 'system' : isInstruction ? 'instruction' : 'custom'
                            };
                        });

                        return {
                            folder,
                            prompts
                        };
                    });

                    return res.status(200).json({ folders: folderContents });
                }

            case 'POST':
                // Handle file upload/update
                if (!req.body.folder || !req.body.filename || !req.body.content) {
                    return res.status(400).json({ error: 'Folder, filename, and content are required' });
                }

                // Ensure the folder exists
                const folderPath = path.join(BASE_DIR, req.body.folder);
                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }

                const uploadPath = path.join(folderPath, req.body.filename);
                fileManager.writeFile(uploadPath, req.body.content);
                return res.status(200).json({ message: 'File uploaded successfully' });

            case 'DELETE':
                // Handle file deletion
                if (!req.query.folder || !req.query.filename) {
                    return res.status(400).json({ error: 'Folder and filename are required' });
                }
                const deletePath = path.join(BASE_DIR, req.query.folder as string, req.query.filename as string);
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