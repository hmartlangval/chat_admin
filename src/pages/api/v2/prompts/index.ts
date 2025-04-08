import { NextApiRequest, NextApiResponse } from 'next';
import { FileAccessManager } from '@lib/file_access_manager';
import path from 'path';
import fs from 'fs';
import { settingsCache } from '@/utils/settingsCache';

let fileManager: FileAccessManager | null = null;
let currentSettings: { [x:string]: any } | null = null;

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

    try {
        // Initialize file manager with cached settings
        /**
         * 
         * Do not remove any of the code below it is working and kept as is, i am going with ENV variables for now.
         */
        // if (!fileManager || !currentSettings) {
        //     currentSettings = await settingsCache.getSettings();
        //     fileManager = new FileAccessManager(currentSettings.prompts_base_dir, currentSettings.static_file_base_url);
        // }

        // if (!fileManager || !currentSettings) {
        //     return res.status(500).json({ error: 'Failed to initialize file manager' });
        // }

        const isLocalhost = req.headers.host?.includes('localhost');

        currentSettings = {
            prompts_base_dir: isLocalhost ? process.env.PROMPTS_DIR_PATH : (await settingsCache.getSettings()).prompts_base_dir,
            static_file_base_url: process.env.STATIC_FILE_BASE_URL
        }
        console.log('currentSettings', currentSettings);

        fileManager = new FileAccessManager(currentSettings.prompts_base_dir, currentSettings.static_file_base_url);

        // After this point, we know these are non-null
        const settings = currentSettings!;
        const manager = fileManager!;

        switch (method) {
            case 'GET':
                if (req.query.folder && req.query.filename) {
                    // Get specific file content
                    const filePath = path.join(settings.prompts_base_dir, req.query.folder as string, req.query.filename as string);
                    if (!manager.fileExists(filePath)) {
                        return res.status(404).json({ error: 'File not found' });
                    }
                    const content = manager.readFile(filePath);
                    return res.status(200).json({ content });
                } else if (req.query.folder) {
                    // Get all prompts in a folder
                    const folderPath = path.join(settings.prompts_base_dir, req.query.folder as string);
                    
                    // Ensure folder exists
                    if (!fs.existsSync(folderPath)) {
                        fs.mkdirSync(folderPath, { recursive: true });
                    }

                    const files = manager.getFilenames(folderPath) || [];
                    
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
                    const folders = manager.getFilenames(settings.prompts_base_dir)
                        .filter(name => {
                            const fullPath = path.join(settings.prompts_base_dir, name);
                            return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
                        });

                    const folderContents: FolderContent[] = folders.map(folder => {
                        const folderPath = path.join(settings.prompts_base_dir, folder);
                        const files = manager.getFilenames(folderPath) || [];
                        
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
                const folderPath = path.join(settings.prompts_base_dir, req.body.folder);
                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }

                const uploadPath = path.join(folderPath, req.body.filename);
                manager.writeFile(uploadPath, req.body.content);
                return res.status(200).json({ message: 'File uploaded successfully' });

            case 'DELETE':
                // Handle file deletion
                if (!req.query.folder || !req.query.filename) {
                    return res.status(400).json({ error: 'Folder and filename are required' });
                }
                const deletePath = path.join(settings.prompts_base_dir, req.query.folder as string, req.query.filename as string);
                if (!manager.fileExists(deletePath)) {
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