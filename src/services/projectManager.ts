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

      await fs.promises.writeFile(filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
      
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

      await fs.promises.writeFile(filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
      
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
      const data = await fs.promises.readFile(filePath, 'utf8');
      const projectData = JSON.parse(data) as ProjectData;
      
      // Validate project data structure
      if (!projectData.version || !projectData.captions) {
        throw new Error('Invalid project file format');
      }

      // Update current project path and reset modified flag
      this.currentProjectPath = filePath;
      this.projectModified = false;
      
      console.log(`Project loaded: ${filePath}`);
      return projectData;
    } catch (error) {
      throw new Error(`Failed to load project: ${error}`);
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

  public generateProjectFileName(videoFileName?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = videoFileName 
      ? videoFileName.replace(/\.[^/.]+$/, '') // Remove extension
      : 'project';
    return `${baseName}-${timestamp}.lvep`;
  }
}

export default ProjectManager;