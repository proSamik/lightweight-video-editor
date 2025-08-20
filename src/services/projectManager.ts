import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProjectData } from '../types';

export class ProjectManager {
  private static instance: ProjectManager;
  private projectsDir: string;
  private currentProjectPath: string | null = null;
  private projectModified: boolean = false;

  private constructor() {
    // Create projects directory in user's documents folder
    this.projectsDir = path.join(os.homedir(), 'Documents', 'Lightweight Video Editor', 'Projects');
    this.ensureProjectsDirectory();
  }

  public static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  private ensureProjectsDirectory(): void {
    try {
      if (!fs.existsSync(this.projectsDir)) {
        fs.mkdirSync(this.projectsDir, { recursive: true });
        console.log(`Created projects directory: ${this.projectsDir}`);
      }
    } catch (error) {
      console.error('Failed to create projects directory:', error);
    }
  }

  /**
   * Get current project path
   */
  public getCurrentProjectPath(): string | null {
    return this.currentProjectPath;
  }

  /**
   * Check if project has been modified
   */
  public isProjectModified(): boolean {
    return this.projectModified;
  }

  /**
   * Mark project as modified
   */
  public markProjectModified(): void {
    this.projectModified = true;
  }

  /**
   * Get current project name for display
   */
  public getCurrentProjectName(): string {
    if (!this.currentProjectPath) {
      return 'Untitled Project';
    }
    return path.basename(this.currentProjectPath, '.lvep');
  }

  /**
   * Save project - defaults to current project path if exists, otherwise creates new
   */
  public async saveProject(projectData: ProjectData, fileName?: string): Promise<string> {
    try {
      let filePath: string;

      if (fileName) {
        // Explicit filename provided - always create new file
        filePath = path.join(this.projectsDir, fileName);
      } else if (this.currentProjectPath) {
        // Save to existing project path
        filePath = this.currentProjectPath;
        console.log(`Saving to existing project: ${filePath}`);
      } else {
        // Create new project with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultFileName = `project-${timestamp}.lvep`;
        filePath = path.join(this.projectsDir, defaultFileName);
        console.log(`Creating new project: ${filePath}`);
      }

      const dataToSave = {
        ...projectData,
        lastModified: Date.now(),
        version: '1.0'
      };

      // Serialize JSON first to check for issues
      const jsonString = JSON.stringify(dataToSave, null, 2);
      const sizeKB = Math.round(jsonString.length / 1024);
      console.log(`Saving project data size: ${jsonString.length} characters (${sizeKB} KB)`);

      // Warn about large project files
      if (sizeKB > 1000) { // 1MB
        console.warn(`⚠️  Large project file: ${sizeKB} KB. Consider reducing caption density for better performance.`);
      } else if (sizeKB > 5000) { // 5MB
        console.warn(`⚠️  Very large project file: ${sizeKB} KB. This may cause performance issues.`);
      }

      // For large files, use streaming write to avoid buffer limits
      const tempFilePath = `${filePath}.tmp`;
      
      if (jsonString.length > 500000) { // 500KB threshold
        console.log('Large project detected, using streaming write...');
        await this.writeFileStreaming(tempFilePath, jsonString);
      } else {
        await fs.promises.writeFile(tempFilePath, jsonString, 'utf8');
      }
      
      await fs.promises.rename(tempFilePath, filePath);
      
      // Update current project path and reset modified flag
      this.currentProjectPath = filePath;
      this.projectModified = false;
      
      console.log(`Project saved: ${filePath}`);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save project: ${error}`);
    }
  }

  /**
   * Save project as new file (Save As functionality)
   */
  public async saveProjectAs(projectData: ProjectData, fileName?: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let finalFileName: string;

      if (fileName) {
        finalFileName = fileName.endsWith('.lvep') ? fileName : `${fileName}.lvep`;
      } else {
        const baseName = this.currentProjectPath ? 
          path.basename(this.currentProjectPath, '.lvep') : 'project';
        finalFileName = `${baseName}-copy-${timestamp}.lvep`;
      }

      const filePath = path.join(this.projectsDir, finalFileName);

      const dataToSave = {
        ...projectData,
        lastModified: Date.now(),
        version: '1.0'
      };

      // Serialize JSON first to check for issues
      const jsonString = JSON.stringify(dataToSave, null, 2);
      const sizeKB = Math.round(jsonString.length / 1024);
      console.log(`Saving project-as data size: ${jsonString.length} characters (${sizeKB} KB)`);

      // Warn about large project files
      if (sizeKB > 1000) { // 1MB
        console.warn(`⚠️  Large project file: ${sizeKB} KB. Consider reducing caption density for better performance.`);
      } else if (sizeKB > 5000) { // 5MB
        console.warn(`⚠️  Very large project file: ${sizeKB} KB. This may cause performance issues.`);
      }

      // For large files, use streaming write to avoid buffer limits
      const tempFilePath = `${filePath}.tmp`;
      
      if (jsonString.length > 500000) { // 500KB threshold
        console.log('Large project detected, using streaming write...');
        await this.writeFileStreaming(tempFilePath, jsonString);
      } else {
        await fs.promises.writeFile(tempFilePath, jsonString, 'utf8');
      }
      
      await fs.promises.rename(tempFilePath, filePath);
      
      // Update current project path to the new file
      this.currentProjectPath = filePath;
      this.projectModified = false;
      
      console.log(`Project saved as: ${filePath}`);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save project as: ${error}`);
    }
  }

  public async loadProject(filePath: string): Promise<ProjectData> {
    try {
      // Check if file exists and get stats
      if (!fs.existsSync(filePath)) {
        throw new Error(`Project file not found: ${filePath}`);
      }

      const stats = await fs.promises.stat(filePath);
      console.log(`Loading project file size: ${stats.size} bytes`);

      // Check for reasonable file size (warn if > 10MB)
      if (stats.size > 10 * 1024 * 1024) {
        console.warn(`Large project file detected: ${stats.size} bytes`);
      }

      // Read file with proper error handling
      const data = await fs.promises.readFile(filePath, 'utf8');
      
      // Log data length vs file size for debugging
      console.log(`File size: ${stats.size}, Data length: ${data.length}`);
      
      // Check for truncated file
      if (data.length === 0) {
        throw new Error('Project file is empty');
      }

      // Try to parse JSON with better error handling
      let projectData: ProjectData;
      try {
        projectData = JSON.parse(data) as ProjectData;
      } catch (parseError) {
        // Try to identify the issue
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        console.error('JSON Parse Error Details:', {
          error: errorMessage,
          fileSize: stats.size,
          dataLength: data.length,
          firstChars: data.substring(0, 100),
          lastChars: data.substring(Math.max(0, data.length - 100))
        });
        
        throw new Error(`Invalid JSON in project file: ${errorMessage}`);
      }
      
      // Validate project data structure
      if (!projectData.version || !projectData.aiSubtitleData) {
        throw new Error('Invalid project file format - missing required fields');
      }

      // Update current project path and reset modified flag
      this.currentProjectPath = filePath;
      this.projectModified = false;
      
      console.log(`Project loaded successfully: ${filePath}`);
      return projectData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Project loading failed:', errorMessage);
      throw new Error(`Failed to load project: ${errorMessage}`);
    }
  }

  /**
   * Create a new project (reset current project state)
   */
  public createNewProject(): void {
    this.currentProjectPath = null;
    this.projectModified = false;
    console.log('New project created');
  }

  public async listRecentProjects(limit: number = 10): Promise<Array<{
    filePath: string;
    fileName: string;
    lastModified: number;
    videoFileName?: string;
  }>> {
    try {
      const files = await fs.promises.readdir(this.projectsDir);
      const projectFiles = files.filter(file => file.endsWith('.lvep'));
      
      const projectsWithMetadata = await Promise.all(
        projectFiles.map(async (fileName) => {
          const filePath = path.join(this.projectsDir, fileName);
          const stats = await fs.promises.stat(filePath);
          
          // Try to read video file name from project
          let videoFileName: string | undefined;
          try {
            const data = await fs.promises.readFile(filePath, 'utf8');
            const projectData = JSON.parse(data) as ProjectData;
            videoFileName = projectData.videoFile?.name;
          } catch (error) {
            // Ignore error, just won't have video file name
          }
          
          return {
            filePath,
            fileName,
            lastModified: stats.mtime.getTime(),
            videoFileName
          };
        })
      );

      // Sort by last modified and return the most recent
      return projectsWithMetadata
        .sort((a, b) => b.lastModified - a.lastModified)
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to list recent projects:', error);
      return [];
    }
  }

  public async deleteProject(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
      console.log(`Project deleted: ${filePath}`);
    } catch (error) {
      throw new Error(`Failed to delete project: ${error}`);
    }
  }

  /**
   * Rename a project file
   */
  public async renameProject(filePath: string, newName: string): Promise<void> {
    try {
      // Always add .lvep extension, remove any existing extension first
      const baseName = newName.replace(/\.[^/.]+$/, ''); // Remove any extension
      const newFileName = `${baseName}.lvep`;
      const newFilePath = path.join(this.projectsDir, newFileName);
      
      // Check if the new file name already exists
      if (fs.existsSync(newFilePath) && newFilePath !== filePath) {
        throw new Error('A project with this name already exists');
      }
      
      // Rename the file
      await fs.promises.rename(filePath, newFilePath);
      
      // Update current project path if this was the current project
      if (this.currentProjectPath === filePath) {
        this.currentProjectPath = newFilePath;
      }
      
      console.log(`Project renamed: ${filePath} -> ${newFilePath}`);
    } catch (error) {
      throw new Error(`Failed to rename project: ${error}`);
    }
  }

  /**
   * Rename the current project
   */
  public async renameCurrentProject(newName: string): Promise<void> {
    if (!this.currentProjectPath) {
      throw new Error('No current project to rename');
    }
    
    await this.renameProject(this.currentProjectPath, newName);
  }

  public async autoSaveProject(projectData: ProjectData): Promise<string> {
    try {
      const autoSaveFileName = 'autosave.lvep';
      return await this.saveProject(projectData, autoSaveFileName);
    } catch (error) {
      console.error('Auto-save failed:', error);
      throw error;
    }
  }

  public getProjectsDirectory(): string {
    return this.projectsDir;
  }

  /**
   * Gets the directory path for a specific project's assets
   */
  public getProjectAssetsDirectory(projectFilePath: string): string {
    const projectBaseName = path.basename(projectFilePath, '.lvep');
    return path.join(path.dirname(projectFilePath), `${projectBaseName}_assets`);
  }

  /**
   * Ensures the project assets directory exists
   */
  public ensureProjectAssetsDirectory(projectFilePath: string): string {
    const assetsDir = this.getProjectAssetsDirectory(projectFilePath);
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
      console.log(`Created project assets directory: ${assetsDir}`);
    }
    return assetsDir;
  }

  public generateProjectFileName(videoFileName?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = videoFileName 
      ? videoFileName.replace(/\.[^/.]+$/, '') // Remove extension
      : 'project';
    return `${baseName}-${timestamp}.lvep`;
  }

  /**
   * Write large files using streaming to avoid buffer limits
   */
  private async writeFileStreaming(filePath: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath, { encoding: 'utf8' });
      
      writeStream.on('error', (error) => {
        console.error('Stream write error:', error);
        reject(error);
      });
      
      writeStream.on('finish', () => {
        console.log('Stream write completed successfully');
        resolve();
      });
      
      // Write in chunks to avoid memory issues
      const chunkSize = 64 * 1024; // 64KB chunks
      let offset = 0;
      
      const writeNextChunk = () => {
        if (offset >= content.length) {
          writeStream.end();
          return;
        }
        
        const chunk = content.slice(offset, offset + chunkSize);
        offset += chunkSize;
        
        if (!writeStream.write(chunk)) {
          // Wait for drain event if buffer is full
          writeStream.once('drain', writeNextChunk);
        } else {
          // Continue immediately
          setImmediate(writeNextChunk);
        }
      };
      
      writeNextChunk();
    });
  }
}

export default ProjectManager;