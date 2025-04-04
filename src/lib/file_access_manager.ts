import * as fs from 'fs';
import * as path from 'path';

export class FileAccessManager {
    /**
     * Reads the content of a file at the specified physical path
     * @param filePath The full physical path to the file (e.g., "c:\\d\\e\\b.md")
     * @returns The content of the file as a string
     * @throws Error if the file doesn't exist or cannot be read
     */
    public readFile(filePath: string): string {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
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
} 