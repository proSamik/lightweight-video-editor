import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { SaveProjectIcon } from './IconComponents';
import { ProjectData } from '../../types';

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (projectData: ProjectData) => void;
  onSaveProject: () => void;
  currentProject?: ProjectData;
}

interface ProjectListItem {
  filePath: string;
  fileName: string;
  lastModified: number;
  videoFileName?: string;
}

const ProjectManagerModal: React.FC<ProjectManagerProps> = ({
  isOpen,
  onClose,
  onLoadProject,
  onSaveProject,
  currentProject
}) => {
  const { theme } = useTheme();
  const [recentProjects, setRecentProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'save'>('recent');

  useEffect(() => {
    if (isOpen) {
      loadRecentProjects();
    }
  }, [isOpen]);

  const loadRecentProjects = async () => {
    try {
      setLoading(true);
      const projects = await window.electronAPI.listRecentProjects();
      setRecentProjects(projects);
    } catch (error) {
      console.error('Failed to load recent projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadProject = async (filePath: string) => {
    try {
      const projectData = await window.electronAPI.loadProject(filePath);
      onLoadProject(projectData);
      onClose();
    } catch (error) {
      console.error('Failed to load project:', error);
      alert('Failed to load project. The file may be corrupted or in an unsupported format.');
    }
  };

  const handleSaveProject = async () => {
    try {
      await onSaveProject();
      loadRecentProjects(); // Refresh the list
      setActiveTab('recent'); // Switch to recent tab to see the saved project
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('Failed to save project.');
    }
  };

  const handleDeleteProject = async (filePath: string) => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await window.electronAPI.deleteProject(filePath);
        loadRecentProjects(); // Refresh the list
      } catch (error) {
        console.error('Failed to delete project:', error);
        alert('Failed to delete project.');
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(timestamp);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: theme.colors.surface,
        borderRadius: '8px',
        padding: '24px',
        minWidth: '600px',
        maxWidth: '800px',
        maxHeight: '80vh',
        border: `1px solid ${theme.colors.border}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: theme.colors.text }}>
            Project Manager
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: theme.colors.textSecondary,
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          marginBottom: '20px',
          borderBottom: `1px solid ${theme.colors.border}`
        }}>
          <button
            onClick={() => setActiveTab('recent')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'recent' ? theme.colors.primary : 'transparent',
              color: theme.colors.text,
              border: 'none',
              borderBottom: activeTab === 'recent' ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Recent Projects
          </button>
          <button
            onClick={() => setActiveTab('save')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'save' ? theme.colors.primary : 'transparent',
              color: theme.colors.text,
              border: 'none',
              borderBottom: activeTab === 'save' ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Save Project
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'recent' && (
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#ccc' }}>
                  Loading projects...
                </div>
              ) : recentProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  No saved projects found.
                  <br />
                  <small>Save your current work to see it here.</small>
                </div>
              ) : (
                <div>
                  {recentProjects.map((project, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        backgroundColor: '#333',
                        marginBottom: '8px',
                        borderRadius: '4px',
                        border: '1px solid #444'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '14px', 
                          color: '#fff',
                          marginBottom: '4px'
                        }}>
                          {project.fileName}
                        </div>
                        {project.videoFileName && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#aaa',
                            marginBottom: '2px'
                          }}>
                            Video: {project.videoFileName}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {formatTimeAgo(project.lastModified)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleLoadProject(project.filePath)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.filePath)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'save' && (
            <div style={{ padding: '20px 0' }}>
              {currentProject ? (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                      Current Project
                    </h3>
                    <div style={{
                      backgroundColor: '#333',
                      padding: '16px',
                      borderRadius: '4px',
                      border: '1px solid #444',
                      fontSize: '14px'
                    }}>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Video:</strong> {currentProject.videoFile?.name || 'No video loaded'}
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Captions:</strong> {currentProject.captions.length} segments
                      </div>
                      <div>
                        <strong>Last Modified:</strong> {formatDate(currentProject.lastModified)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProject}
                    style={{
                      width: '100%',
                      padding: '12px 24px',
                      backgroundColor: theme.colors.primary,
                      color: theme.colors.text,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <SaveProjectIcon size={18} />
                    Save Project
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  No project data to save.
                  <br />
                  <small>Load a video and create captions first.</small>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectManagerModal;