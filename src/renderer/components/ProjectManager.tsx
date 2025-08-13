import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { SaveProjectIcon } from './IconComponents';
import { ProjectData } from '../../types';
import { LiquidModal } from './ui';
import { FiX, FiPlay, FiTrash2, FiCalendar, FiVideo, FiEdit3, FiCheck, FiFolder } from 'react-icons/fi';

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
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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

  const handleStartRename = (project: ProjectListItem) => {
    setEditingProject(project.filePath);
    // Remove the .lvep extension for editing
    const baseName = project.fileName.replace(/\.lvep$/, '');
    setEditName(baseName);
  };

  const handleCancelRename = () => {
    setEditingProject(null);
    setEditName('');
  };

  const handleConfirmRename = async () => {
    if (!editingProject || !editName.trim()) {
      handleCancelRename();
      return;
    }

    try {
      await window.electronAPI.renameProject(editingProject, editName.trim());
      loadRecentProjects(); // Refresh the list
      handleCancelRename();
    } catch (error) {
      console.error('Failed to rename project:', error);
      alert('Failed to rename project. Please try again.');
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
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      title="Project Manager"
      subtitle="Manage your video editing projects"
      icon={<SaveProjectIcon size={24} color="white" />}
      maxWidth="900px"
    >
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '400px'
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.modal.background,
          flexShrink: 0
        }}>
          <button
            onClick={() => setActiveTab('recent')}
            style={{
              flex: 1,
              padding: '16px 24px',
              backgroundColor: 'transparent',
              color: activeTab === 'recent' ? theme.colors.text : theme.colors.textSecondary,
              border: 'none',
              borderBottom: activeTab === 'recent' ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'recent' ? '500' : '400',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'recent') {
                e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'recent') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            Recent Projects
          </button>
          <button
            onClick={() => setActiveTab('save')}
            style={{
              flex: 1,
              padding: '16px 24px',
              backgroundColor: 'transparent',
              color: activeTab === 'save' ? theme.colors.text : theme.colors.textSecondary,
              border: 'none',
              borderBottom: activeTab === 'save' ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'save' ? '500' : '400',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'save') {
                e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'save') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            Save Project
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '24px',
          backgroundColor: theme.colors.modal.background,
          minHeight: 0
        }}>
          {activeTab === 'recent' && (
            <div>
              {loading ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px', 
                  color: theme.colors.textMuted 
                }}>
                  <div style={{
                    fontSize: '16px',
                    marginBottom: '8px'
                  }}>
                    Loading projects...
                  </div>
                </div>
              ) : recentProjects.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px', 
                  color: theme.colors.textSecondary 
                }}>
                  <div style={{
                    fontSize: '16px',
                    marginBottom: '8px',
                    fontWeight: '500'
                  }}>
                    No saved projects found
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: theme.colors.textMuted
                  }}>
                    Save your current work to see it here
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recentProjects.map((project, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '20px',
                        backgroundColor: theme.colors.modal.background,
                        borderRadius: '8px',
                        border: `1px solid ${theme.colors.border}`,
                        transition: 'all 0.15s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.sidebar.itemHover;
                        e.currentTarget.style.borderColor = theme.colors.primary + '40';
                        e.currentTarget.style.boxShadow = `0 4px 12px ${theme.colors.primary}15`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.modal.background;
                        e.currentTarget.style.borderColor = theme.colors.border;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        {editingProject === project.filePath ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px'
                          }}>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleConfirmRename();
                                } else if (e.key === 'Escape') {
                                  handleCancelRename();
                                }
                              }}
                              style={{
                                flex: 1,
                                padding: '6px 12px',
                                fontSize: '16px',
                                fontWeight: '500',
                                color: theme.colors.text,
                                backgroundColor: theme.colors.input.background,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: '4px',
                                outline: 'none'
                              }}
                              autoFocus
                            />
                            <button
                              onClick={handleConfirmRename}
                              style={{
                                padding: '6px',
                                backgroundColor: theme.colors.success,
                                color: theme.colors.successForeground,
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <FiCheck size={14} />
                            </button>
                            <button
                              onClick={handleCancelRename}
                              style={{
                                padding: '6px',
                                backgroundColor: theme.colors.secondary,
                                color: theme.colors.secondaryForeground,
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <FiX size={14} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ 
                            fontSize: '16px', 
                            color: theme.colors.text,
                            marginBottom: '8px',
                            fontWeight: '500'
                          }}>
                            {project.fileName}
                          </div>
                        )}
                        {project.videoFileName && (
                          <div style={{ 
                            fontSize: '14px', 
                            color: theme.colors.textSecondary,
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <FiVideo size={14} />
                            <span>{project.videoFileName}</span>
                          </div>
                        )}
                        <div style={{ 
                          fontSize: '12px', 
                          color: theme.colors.textMuted,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <FiCalendar size={12} />
                          <span>{formatTimeAgo(project.lastModified)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadProject(project.filePath);
                          }}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: theme.colors.primary,
                            color: theme.colors.primaryForeground,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = theme.colors.primary;
                          }}
                        >
                          <FiPlay size={14} />
                          Load
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(project);
                          }}
                          style={{
                            padding: '8px',
                            backgroundColor: 'transparent',
                            color: theme.colors.textMuted,
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.colors.accent;
                            e.currentTarget.style.color = theme.colors.accentForeground;
                            e.currentTarget.style.borderColor = theme.colors.accent;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = theme.colors.textMuted;
                            e.currentTarget.style.borderColor = theme.colors.border;
                          }}
                        >
                          <FiEdit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.filePath);
                          }}
                          style={{
                            padding: '8px',
                            backgroundColor: 'transparent',
                            color: theme.colors.textMuted,
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.colors.error;
                            e.currentTarget.style.color = theme.colors.errorForeground;
                            e.currentTarget.style.borderColor = theme.colors.error;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = theme.colors.textMuted;
                            e.currentTarget.style.borderColor = theme.colors.border;
                          }}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'save' && (
            <div>
              {currentProject ? (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ 
                      margin: '0 0 16px 0', 
                      fontSize: '18px',
                      fontWeight: '600',
                      color: theme.colors.text 
                    }}>
                      Current Project
                    </h3>
                    <div style={{
                      backgroundColor: theme.colors.modal.background,
                      padding: '20px',
                      borderRadius: '8px',
                      border: `1px solid ${theme.colors.border}`,
                      fontSize: '14px'
                    }}>
                      <div style={{ 
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <FiVideo size={16} color={theme.colors.textSecondary} />
                        <span style={{ color: theme.colors.textSecondary }}>Video:</span>
                        <span style={{ color: theme.colors.text, fontWeight: '500' }}>
                          {currentProject.videoFile?.name || 'No video loaded'}
                        </span>
                      </div>
                      <div style={{ 
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ color: theme.colors.textSecondary }}>Captions:</span>
                        <span style={{ color: theme.colors.text, fontWeight: '500' }}>
                          {currentProject.captions.length} segments
                        </span>
                      </div>
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <FiCalendar size={16} color={theme.colors.textSecondary} />
                        <span style={{ color: theme.colors.textSecondary }}>Last Modified:</span>
                        <span style={{ color: theme.colors.text, fontWeight: '500' }}>
                          {formatDate(currentProject.lastModified)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProject}
                    style={{
                      width: '100%',
                      padding: '16px 24px',
                      backgroundColor: theme.colors.primary,
                      color: theme.colors.primaryForeground,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.primary;
                    }}
                  >
                    <SaveProjectIcon size={20} />
                    Save Project
                  </button>
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px', 
                  color: theme.colors.textSecondary 
                }}>
                  <div style={{
                    fontSize: '16px',
                    marginBottom: '8px',
                    fontWeight: '500'
                  }}>
                    No project data to save
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: theme.colors.textMuted
                  }}>
                    Load a video and create captions first
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </LiquidModal>
  );
};

export default ProjectManagerModal;