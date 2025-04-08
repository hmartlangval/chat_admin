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

interface Action {
    name: string;
    prompts: PromptFile[];
}

interface Folder {
    folder: string;
    actions: Action[];
    actionsOrder: string[];
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
                    const action = req.query.action as string || 'default';
                    const filePath = path.join(settings.prompts_base_dir, req.query.folder as string, action, req.query.filename as string);
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

                    // Get all subdirectories (actions)
                    const items = fs.readdirSync(folderPath, { withFileTypes: true });
                    const actionDirs = items.filter(item => item.isDirectory()).map(dir => dir.name);
                    
                    // If no actions exist, create default action directory
                    if (actionDirs.length === 0) {
                        const defaultActionPath = path.join(folderPath, 'default');
                        fs.mkdirSync(defaultActionPath, { recursive: true });
                        actionDirs.push('default');
                    }

                    const actions: Action[] = [];
                    
                    // Process each action directory
                    for (const actionName of actionDirs) {
                        const actionPath = path.join(folderPath, actionName);
                        const files = manager.getFilenames(actionPath) || [];
                        
                        const prompts: PromptFile[] = files.map(file => {
                            const isSystem = file === 'system_prompt.md';
                            const isInstruction = file === 'instructions.md';
                            return {
                                name: file,
                                path: path.join(actionName, file),
                                type: isSystem ? 'system' : isInstruction ? 'instruction' : 'custom'
                            };
                        });

                        // Ensure default prompts exist for each action
                        const hasSystemPrompt = files.includes('system_prompt.md');
                        const hasInstructionPrompt = files.includes('instructions.md');
                        
                        if (!hasSystemPrompt) {
                            prompts.push({
                                name: 'system_prompt.md',
                                path: path.join(actionName, 'system_prompt.md'),
                                type: 'system'
                            });
                        }
                        
                        if (!hasInstructionPrompt) {
                            prompts.push({
                                name: 'instructions.md',
                                path: path.join(actionName, 'instructions.md'),
                                type: 'instruction'
                            });
                        }

                        actions.push({
                            name: actionName,
                            prompts
                        });
                    }

                    return res.status(200).json({ 
                        folder: req.query.folder as string,
                        actions
                    });
                } else {
                    // List all folders and their contents
                    const folders = await manager.listFolders();
                    const result: Folder[] = [];

                    for (const folder of folders) {
                        const actions = await manager.listActions(folder);
                        const actionsOrder = await manager.getActionsOrder(folder);
                        
                        const actionPrompts: Action[] = [];
                        for (const action of actions) {
                            const prompts = await manager.listPrompts(folder, action);
                            actionPrompts.push({
                                name: action,
                                prompts: prompts.map(prompt => ({
                                    name: prompt,
                                    path: `${folder}/${action}/${prompt}`,
                                    type: prompt.startsWith('system_') ? 'system' : 
                                          prompt.startsWith('instruction_') ? 'instruction' : 'custom'
                                }))
                            });
                        }

                        result.push({
                            folder,
                            actions: actionPrompts,
                            actionsOrder: actionsOrder || actions // Use existing order or default to alphabetical
                        });
                    }

                    return res.status(200).json({ folders: result });
                }

            case 'POST':
                try {
                    const { folder, filename, content, action, actionsOrder } = req.body;
                    const fileAccessManager = new FileAccessManager(settings.prompts_base_dir, settings.static_file_base_url);

                    if (actionsOrder) {
                        // Handle action order update
                        await fileAccessManager.saveActionsOrder(folder, actionsOrder);
                        res.status(200).json({ success: true });
                    } else {
                        // Handle file content update
                        if (!folder || !filename) {
                            return res.status(400).json({ error: 'Folder and filename are required' });
                        }

                        const actionDir = action || 'default';
                        const filePath = `${settings.prompts_base_dir}/${folder}/${actionDir}/${filename}`;
                        console.log('filePath... writing to a file', settings.prompts_base_dir, filePath, content);
                        await fileAccessManager.writeFile(filePath, content);
                        res.status(200).json({ success: true });
                    }
                } catch (error) {
                    console.error('Error in prompts API:', error);
                    res.status(500).json({ error: 'Internal server error' });
                }

            case 'DELETE':
                // Handle file deletion
                if (!req.query.folder || !req.query.filename) {
                    return res.status(400).json({ error: 'Folder and filename are required' });
                }
                const deleteAction = req.query.action as string || 'default';
                const deletePath = path.join(settings.prompts_base_dir, req.query.folder as string, deleteAction, req.query.filename as string);
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