import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';

export interface FileItem {
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
    modified: Date;
    url?: string;
    itemCount?: number;
}

export class FileAccessManager {
    private basePath: string;
    private staticFileBaseUrl: string;

    constructor(basePath: string, staticFileBaseUrl: string) {
        if (!basePath) {
            throw new Error('basePath is required');
        }
        // if (!staticFileBaseUrl) {
        //   throw new Error('staticFileBaseUrl is required');
        // }
        // Normalize the path for Windows
        this.basePath = basePath.replace(/\//g, '\\');
        this.staticFileBaseUrl = staticFileBaseUrl;
    }

    /**
     * Reads the content of a file at the specified physical path
     * @param filePath The full physical path to the file (e.g., "c:\\d\\e\\b.md")
     * @returns The content of the file as a string
     * @throws Error if the file doesn't exist or cannot be read
     */
    public readFile(filePath: string): string {
        try {
            if (!fs.existsSync(filePath)) {
                filePath = path.join(this.basePath, filePath);
                if (!fs.existsSync(filePath)) {
                    throw new Error(`File not found: ${filePath}`);
                }
            }
            return fs.readFileSync(filePath, 'utf-8');
        } catch (error: any) {
            throw new Error(`Error reading file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Writes content to a file at the specified physical path
     * @param filePath The full physical path to the file (e.g., "c:\\d\\e\\b.md")
     * @param content The content to write to the file
     * @throws Error if the file cannot be written
     */
    public writeFile(filePath: string, content: string): void {
        try {
            // Ensure the directory exists
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, content, 'utf-8');
        } catch (error: any) {
            throw new Error(`Error writing to file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Writes content to a file at the specified physical path
     * @param relativeFilePath The full physical path to the file (e.g., "c:\\d\\e\\b.md")
     * @param content The content to write to the file
     * @throws Error if the file cannot be written
     */
    public writeFileRelative(relativeFilePath: string, content: string): void {
        try {
            // Ensure the directory exists
            const filePath = path.join(this.basePath, relativeFilePath);
            const dir = path.dirname(filePath);
            console.log('directory:', dir);
            console.log('Writing to file:', filePath);
            if (!fs.existsSync(dir)) {
                console.log('Directory does not exist, creating:', dir);
                fs.mkdirSync(dir, { recursive: true });
            }
            console.log('Writing content:', filePath, content);
            fs.writeFileSync(filePath, content, 'utf-8');
        } catch (error: any) {
            throw new Error(`Error writing to file ${relativeFilePath}: ${error.message}`);
        }
    }

    /**
     * Checks if a file exists at the specified path
     * @param filePath The full physical path to check
     * @returns true if the file exists, false otherwise
     */
    public fileExists(filePath: string): boolean {
        return fs.existsSync(filePath);
    }

    /**
     * Gets all filenames in a given directory
     * @param directoryPath The full physical path to the directory
     * @returns Array of filenames in the directory
     * @throws Error if the directory doesn't exist or cannot be read
     */
    public getFilenames(directoryPath: string): string[] {
        try {
            if (!fs.existsSync(directoryPath)) {
                throw new Error(`Directory not found: ${directoryPath}`);
            }

            const stats = fs.statSync(directoryPath);
            if (!stats.isDirectory()) {
                throw new Error(`Path is not a directory: ${directoryPath}`);
            }

            return fs.readdirSync(directoryPath);
        } catch (error: any) {
            throw new Error(`Error reading directory ${directoryPath}: ${error.message}`);
        }
    }

    /**
     * Calculates the total size of a directory recursively
     * @param dirPath The full physical path to the directory
     * @returns Total size in bytes
     */
    private calculateDirectorySize(dirPath: string): number {
        let totalSize = 0;
        const items = fs.readdirSync(dirPath);

        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
                totalSize += this.calculateDirectorySize(itemPath);
            } else {
                totalSize += stats.size;
            }
        }

        return totalSize;
    }

    /**
     * Counts the number of items in a directory
     * @param dirPath The full physical path to the directory
     * @returns Number of items in the directory
     */
    private countDirectoryItems(dirPath: string): number {
        const items = fs.readdirSync(dirPath);
        return items.length;
    }

    /**
     * Lists the contents of a directory
     * @param relativePath Optional relative path from the base directory
     * @returns Array of FileItem objects
     */
    public listDirectory(relativePath: string = ''): FileItem[] {
        const fullPath = relativePath ? path.join(this.basePath, relativePath) : this.basePath;

        if (!fs.existsSync(fullPath)) {
            throw new Error(`Directory not found: ${fullPath}`);
        }

        const items = fs.readdirSync(fullPath);
        const result: FileItem[] = items.map(item => {
            const itemPath = path.join(fullPath, item);
            const stats = fs.statSync(itemPath);
            const url = !stats.isDirectory() ? `${this.staticFileBaseUrl}/${relativePath ? `${relativePath}/` : ''}${item}` : undefined;
            const size = stats.isDirectory() ? this.calculateDirectorySize(itemPath) : stats.size;

            return {
                name: item,
                path: relativePath ? path.join(relativePath, item) : item,
                isDirectory: stats.isDirectory(),
                size,
                modified: stats.mtime,
                url,
                itemCount: stats.isDirectory() ? this.countDirectoryItems(itemPath) : undefined
            };
        });

        // Sort by directory first, then by modified date
        result.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return b.modified.getTime() - a.modified.getTime();
        });

        return result;
    }

    /**
     * Creates a read stream for a file
     * @param relativePath Relative path from the base directory
     * @returns Readable stream
     */
    public createReadStream(relativePath: string): fs.ReadStream {
        const fullPath = path.join(this.basePath, relativePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${fullPath}`);
        }
        return fs.createReadStream(fullPath);
    }

    /**
     * Creates a ZIP archive of a directory
     * @param relativePath Relative path from the base directory
     * @returns Promise that resolves to a Buffer containing the ZIP file
     */
    public async createZipArchive(relativePath: string): Promise<Buffer> {
        const fullPath = path.join(this.basePath, relativePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`Directory not found: ${fullPath}`);
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
        return await zip.generateAsync({ type: 'nodebuffer' });
    }

    public async listFolders(): Promise<string[]> {
        const items = fs.readdirSync(this.basePath, { withFileTypes: true });
        return items.filter(item => item.isDirectory()).map(dir => dir.name);
    }

    public async listActions(folder: string): Promise<string[]> {
        const folderPath = path.join(this.basePath, folder);
        if (!fs.existsSync(folderPath)) {
            return [];
        }
        const items = fs.readdirSync(folderPath, { withFileTypes: true });
        return items.filter(item => item.isDirectory()).map(dir => dir.name);
    }

    public async listPrompts(folder: string, action: string): Promise<string[]> {
        const actionPath = path.join(this.basePath, folder, action);
        if (!fs.existsSync(actionPath)) {
            return [];
        }
        return this.getFilenames(actionPath);
    }

    public async getActionsOrder(folder: string): Promise<string[]> {
        const orderPath = path.join(this.basePath, folder, 'actions_order.json');
        if (!fs.existsSync(orderPath)) {
            return [];
        }
        try {
            const content = fs.readFileSync(orderPath, 'utf-8');
            return JSON.parse(content);
        } catch {
            return [];
        }
    }

    public async saveActionsOrder(folder: string, order: string[]): Promise<void> {
        const orderPath = path.join(this.basePath, folder, 'actions_order.json');
        this.writeFile(orderPath, JSON.stringify(order, null, 2));
    }
} 