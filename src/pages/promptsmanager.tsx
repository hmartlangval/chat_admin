import React, { useEffect, useState } from 'react';
import MarkdownIt from 'markdown-it';
import MdEditor from 'react-markdown-editor-lite';
import AdminLayout from '@/components/layout/AdminLayout';
import 'react-markdown-editor-lite/lib/index.css';
import { FileAccessManager } from '@lib/file_access_manager';
import { settingsCache } from '@/utils/settingsCache';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';

// Initialize markdown parser
const mdParser = new MarkdownIt({
  breaks: true,
  html: true,
  linkify: true,
});

interface PromptFile {
  name: string;
  path: string;
  type: 'system' | 'instruction' | 'custom';
}

interface Action {
  name: string;
  prompts: PromptFile[];
  activeSystemPrompt?: string;
  activeInstructionPrompt?: string;
}

interface Folder {
  folder: string;
  actions: Action[];
}

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Confirm Action</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm text-white bg-gray-700 rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

const PromptsManager: React.FC = () => {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('default');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptFile | null>(null);
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newPromptName, setNewPromptName] = useState<string>('');
  const [isCreatingAction, setIsCreatingAction] = useState<boolean>(false);
  const [newActionName, setNewActionName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const md = new MarkdownIt();

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/v2/prompts');
      if (!response.ok) throw new Error('Failed to fetch folders');
      const data = await response.json();
      console.log('Fetched data:', data); // Debug log
      setFolders(data.folders);
      
      // If we have folders but no selected folder, select the first one
      if (data.folders.length > 0 && !selectedFolder) {
        handleFolderSelect(data.folders[0].folder);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch folders');
    }
  };

  const handleFolderSelect = (folder: string) => {
    setSelectedFolder(folder);
    const firstAction = folders.find(f => f.folder === folder)?.actions[0]?.name || 'default';
    setSelectedAction(firstAction);
    setSelectedPrompt(null);
    setContent('');
    setOriginalContent('');
    setIsCreatingNew(false);
    setIsCreatingAction(false);
  };

  const handleActionSelect = async (action: string) => {
    setSelectedAction(action);
    setSelectedPrompt(null);
    setContent('');
    setOriginalContent('');
    setIsCreatingNew(false);

    // Fetch active prompts for the selected action
    try {
      const response = await fetch(`/api/v2/prompts/active?folder=${selectedFolder}&action=${action}`);
      if (!response.ok) throw new Error('Failed to fetch active prompts');
      const data = await response.json();
      
      // Update local state with active prompts
      const updatedFolders = folders.map(folder => {
        if (folder.folder === selectedFolder) {
          return {
            ...folder,
            actions: folder.actions.map(a => {
              if (a.name === action) {
                return {
                  ...a,
                  activeSystemPrompt: data.activeSystemPrompt,
                  activeInstructionPrompt: data.activeInstructionPrompt
                };
              }
              return a;
            })
          };
        }
        return folder;
      });

      setFolders(updatedFolders);
    } catch (err) {
      console.error('Error fetching active prompts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch active prompts');
    }
  };

  const handlePromptSelect = async (prompt: PromptFile) => {
    if (content !== originalContent) {
      setPendingAction(() => () => handlePromptSelect(prompt));
      setConfirmModal(true);
      return;
    }

    try {
      const response = await fetch(`/api/v2/prompts?folder=${selectedFolder}&filename=${prompt.name}&action=${selectedAction}`);
      if (!response.ok) throw new Error('Failed to fetch prompt content');
      const data = await response.json();
      setSelectedPrompt(prompt);
      setContent(data.content);
      setOriginalContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prompt content');
    }
  };

  const handleSave = async () => {
    if (!selectedFolder || !selectedPrompt) return;

    try {
      const response = await fetch('/api/v2/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: selectedFolder,
          filename: selectedPrompt.name,
          content,
          action: selectedAction
        })
      });

      if (!response.ok) throw new Error('Failed to save prompt');
      setOriginalContent(content);
      toast.success('Prompt saved successfully');
    } catch (err) {
      console.error('Error saving prompt:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save prompt');
    }
  };

  const handleNewPrompt = () => {
    if (!selectedFolder) {
      setError('Please select a folder first');
      return;
    }
    setIsCreatingNew(true);
    setNewPromptName('');
  };

  const handleNewAction = () => {
    if (!selectedFolder) {
      setError('Please select a folder first');
      return;
    }
    setIsCreatingAction(true);
    setNewActionName('');
  };

  const handleCreatePrompt = async () => {
    if (!newPromptName) {
      toast.error('Please enter a prompt name');
      return;
    }

    const sanitizedName = newPromptName.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
    const filename = sanitizedName.endsWith('.md') ? sanitizedName : `${sanitizedName}.md`;

    try {
      const response = await fetch('/api/v2/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: selectedFolder,
          filename,
          content: '',
          action: selectedAction
        })
      });

      if (!response.ok) throw new Error('Failed to create prompt');
      await fetchFolders();
      setIsCreatingNew(false);
      setNewPromptName('');
      toast.success('Prompt created successfully');
    } catch (err) {
      console.error('Error creating prompt:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create prompt');
    }
  };

  const handleCreateAction = async () => {
    if (!newActionName) {
      toast.error('Please enter an action name');
      return;
    }

    const sanitizedName = newActionName.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();

    try {
      // Create the action directory by creating a dummy file
      const response = await fetch('/api/v2/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: selectedFolder,
          filename: 'system_prompt.md',
          content: '',
          action: sanitizedName
        })
      });

      if (!response.ok) throw new Error('Failed to create action');
      await fetchFolders();
      setIsCreatingAction(false);
      setNewActionName('');
      setSelectedAction(sanitizedName);
      toast.success('Action created successfully');
    } catch (err) {
      console.error('Error creating action:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create action');
    }
  };

  const handleDeletePrompt = async () => {
    if (!selectedFolder || !selectedPrompt) return;

    try {
      const response = await fetch(`/api/v2/prompts?folder=${selectedFolder}&filename=${selectedPrompt.name}&action=${selectedAction}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete prompt');
      await fetchFolders();
      setSelectedPrompt(null);
      setContent('');
      setOriginalContent('');
      toast.success('Prompt deleted successfully');
    } catch (err) {
      console.error('Error deleting prompt:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete prompt');
    }
  };

  const handleConfirm = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setConfirmModal(false);
  };

  const handleCancel = () => {
    setPendingAction(null);
    setConfirmModal(false);
  };

  const handleToggleActivePrompt = async (prompt: PromptFile, type: 'system' | 'instruction') => {
    if (!selectedFolder || !selectedAction) return;

    try {
      const response = await fetch('/api/v2/prompts/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: selectedFolder,
          action: selectedAction,
          promptPath: prompt.path,
          type
        })
      });

      if (!response.ok) throw new Error('Failed to update active prompt');
      
      // Update local state
      const updatedFolders = folders.map(folder => {
        if (folder.folder === selectedFolder) {
          return {
            ...folder,
            actions: folder.actions.map(action => {
              if (action.name === selectedAction) {
                return {
                  ...action,
                  activeSystemPrompt: type === 'system' ? prompt.path : action.activeSystemPrompt,
                  activeInstructionPrompt: type === 'instruction' ? prompt.path : action.activeInstructionPrompt
                };
              }
              return action;
            })
          };
        }
        return folder;
      });

      setFolders(updatedFolders);
      toast.success('Active prompt updated');
    } catch (err) {
      console.error('Error updating active prompt:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update active prompt');
    }
  };

  const currentFolder = folders.find(f => f.folder === selectedFolder);
  const currentAction = currentFolder?.actions.find(a => a.name === selectedAction);
  const currentPrompts = currentAction?.prompts || [];

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Prompts Manager</h1>

        {error && (
          <div key="error" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="space-y-6">
                <div>
                  <div className="relative">
                    <select
                      id="bot-select"
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-transparent bg-white appearance-none text-gray-500"
                      value={selectedFolder}
                      onChange={(e) => handleFolderSelect(e.target.value)}
                    >
                      <option value="" disabled>Select Bot</option>
                      {folders.map((folder) => (
                        <option key={`folder-${folder.folder}`} value={folder.folder} className="text-gray-900">
                          {folder.folder}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {selectedFolder && (
                  <>
                    <div>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <select
                            id="action-select"
                            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-transparent bg-white appearance-none text-gray-500"
                            value={selectedAction}
                            onChange={(e) => handleActionSelect(e.target.value)}
                          >
                            <option value="" disabled>Select Action</option>
                            {currentFolder?.actions.map((action) => (
                              <option key={`action-${action.name}`} value={action.name} className="text-gray-900">
                                {action.name}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        <button
                          className="px-2.5 py-1 text-xs text-white bg-gray-700 rounded hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                          onClick={handleNewAction}
                          // disabled={isCreatingAction}
                          disabled={true}
                        >
                          Add Action
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-600">Prompts</label>
                        <button
                          className="px-2.5 py-1 text-xs text-white bg-gray-700 rounded hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                          onClick={handleNewPrompt}
                          disabled={isCreatingNew}
                        >
                          New Prompt
                        </button>
                      </div>
                    </div>

                    {isCreatingNew ? (
                      <div key="create-prompt" className="mb-3">
                        <input
                          type="text"
                          className="w-full px-2.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-transparent mb-2"
                          placeholder="Enter prompt name"
                          value={newPromptName}
                          onChange={(e) => setNewPromptName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreatePrompt();
                            if (e.key === 'Escape') {
                              setIsCreatingNew(false);
                              setNewPromptName('');
                            }
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            className="px-2.5 py-1 text-xs text-white bg-gray-700 rounded hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-500"
                            onClick={handleCreatePrompt}
                          >
                            Create
                          </button>
                          <button
                            className="px-2.5 py-1 text-xs text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-300"
                            onClick={() => {
                              setIsCreatingNew(false);
                              setNewPromptName('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-0.5">
                      {currentPrompts.map((prompt) => {
                        const isSystem = currentAction?.activeSystemPrompt === prompt.path;
                        const isInstruction = currentAction?.activeInstructionPrompt === prompt.path;
                        
                        return (
                          <div
                            key={`prompt-${prompt.path}`}
                            className={`px-2.5 py-1 text-xs rounded cursor-pointer flex items-center justify-between group ${
                              selectedPrompt?.path === prompt.path
                                ? 'bg-gray-100 border border-gray-200'
                                : 'hover:bg-gray-50 border border-transparent'
                            }`}
                            onClick={() => handlePromptSelect(prompt)}
                          >
                            <span>{prompt.name}</span>
                            <div className="flex gap-1">
                              <button
                                className={`p-1 rounded-full ${
                                  isSystem
                                    ? 'bg-green-100 text-green-600 cursor-default'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isSystem) {
                                    handleToggleActivePrompt(prompt, 'system');
                                  }
                                }}
                                disabled={isSystem}
                                title="Set as System Prompt"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                </svg>
                                <span className="sr-only">Set as System Prompt</span>
                              </button>
                              <button
                                className={`p-1 rounded-full ${
                                  isInstruction
                                    ? 'bg-green-100 text-green-600 cursor-default'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isInstruction) {
                                    handleToggleActivePrompt(prompt, 'instruction');
                                  }
                                }}
                                disabled={isInstruction}
                                title="Set as Instruction Prompt"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="sr-only">Set as Instruction Prompt</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              {selectedPrompt ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">{selectedPrompt.name}</h2>
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1.5 text-sm text-white bg-gray-700 rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleSave}
                        disabled={content === originalContent}
                      >
                        Save
                      </button>
                      <button
                        className="px-3 py-1.5 text-sm text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        onClick={handleDeletePrompt}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <MdEditor
                    style={{ height: '500px' }}
                    renderHTML={(text) => mdParser.render(text)}
                    onChange={({ text }) => setContent(text)}
                    value={content}
                  />
                </>
              ) : (
                <div className="text-center text-gray-500 text-sm">
                  Select a prompt to edit
                </div>
              )}
            </div>
          </div>
        </div>

        {confirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Unsaved Changes</h3>
              <p className="mb-4 text-sm text-gray-600">You have unsaved changes. Do you want to continue?</p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1.5 text-sm text-white bg-gray-700 rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  onClick={handleConfirm}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PromptsManager; 