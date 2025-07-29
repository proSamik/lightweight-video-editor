import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProjectData } from '../types';

export class ProjectManager {
  private static instance: ProjectManager;
  private projectsDir: string;

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

  public async saveProject(projectData: ProjectData, fileName?: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultFileName = `project-${timestamp}.lvep`;
      const finalFileName = fileName || defaultFileName;
      const filePath = path.join(this.projectsDir, finalFileName);

      const dataToSave = {
        ...projectData,
        lastModified: Date.now(),
        version: '1.0'
      };

      await fs.promises.writeFile(filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
      console.log(`Project saved: ${filePath}`);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save project: ${error}`);
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

      return projectData;
    } catch (error) {
      throw new Error(`Failed to load project: ${error}`);
    }
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