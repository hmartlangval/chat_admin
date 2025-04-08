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
  requires_browser?: boolean;
  prompt_scripts?: string[];
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
  const [scripts, setScripts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'prompts' | 'scripts'>('prompts');

  const md = new MarkdownIt();

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/v2/prompts');
      if (!response.ok) throw new Error('Failed to fetch folders');
      const data = await response.json();
      setFolders(data.folders);

      // If we have folders but no selected folder, select the first one
      if (data.folders.length > 0 && !selectedFolder) {
        const firstFolder = data.folders[0].folder;
        const firstAction = data.folders[0].actions[0]?.name || 'default';
        setSelectedFolder(firstFolder);
        setSelectedAction(firstAction);
        // Fetch active prompts for initial folder/action
        await fetchFolderState(firstFolder, firstAction);
      }
    } catch (err) {
      console.error('Error fetching folders:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to fetch folders');
    }
  };

  // Single function to fetch folder state (folders list + active prompts)
  const fetchFolderState = async (folder: string, action: string) => {
    try {
      const [foldersResponse, activeResponse] = await Promise.all([
        fetch('/api/v2/prompts'),
        fetch(`/api/v2/prompts/config?folder=${folder}&action=${action}`)
      ]);

      if (!foldersResponse.ok) throw new Error('Failed to fetch folders');
      if (!activeResponse.ok) throw new Error('Failed to fetch active prompts');

      const [foldersData, activeData] = await Promise.all([
        foldersResponse.json(),
        activeResponse.json()
      ]);

      const updatedFolders = foldersData.folders.map((f: Folder) => {
        if (f.folder === folder) {
          return {
            ...f,
            actions: f.actions.map(a => {
              if (a.name === action) {
                return {
                  ...a,
                  activeSystemPrompt: activeData.activeSystemPrompt,
                  activeInstructionPrompt: activeData.activeInstructionPrompt,
                  requires_browser: activeData.requires_browser,
                  prompt_scripts: activeData.prompt_scripts
                };
              }
              return a;
            })
          };
        }
        return f;
      });

      setFolders(updatedFolders);
    } catch (err) {
      console.error('Error fetching folder state:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to fetch folder state');
    }
  };

  const fetchScripts = async () => {
    try {
      const response = await fetch('/api/v2/prompts/scripts');
      if (!response.ok) throw new Error('Failed to fetch scripts');
      const data = await response.json();
      setScripts(data.scripts);
    } catch (error) {
      console.error('Error fetching scripts:', error);
      toast.error('Failed to fetch scripts');
    }
  };

  useEffect(() => {
    fetchFolders();
    fetchScripts();
  }, []);

  const handleFolderSelect = (folder: string) => {
    if (content !== originalContent) {
      setPendingAction(() => () => {
        setSelectedFolder(folder);
        setSelectedPrompt(null);
        setContent('');
        setOriginalContent('');
        setIsCreatingNew(false);

        const firstAction = folders.find(f => f.folder === folder)?.actions[0]?.name || 'default';
        setSelectedAction(firstAction);
        fetchFolderState(folder, firstAction);
      });
      setConfirmModal(true);
      return;
    }

    setSelectedFolder(folder);
    setSelectedPrompt(null);
    setContent('');
    setOriginalContent('');
    setIsCreatingNew(false);

    const firstAction = folders.find(f => f.folder === folder)?.actions[0]?.name || 'default';
    setSelectedAction(firstAction);
    fetchFolderState(folder, firstAction);
  };

  const handleActionSelect = (action: string) => {
    if (content !== originalContent) {
      setPendingAction(() => () => {
        if (selectedFolder) {
          setSelectedAction(action);
          setSelectedPrompt(null);
          setContent('');
          setOriginalContent('');
          setIsCreatingNew(false);
          fetchFolderState(selectedFolder, action);
        }
      });
      setConfirmModal(true);
      return;
    }

    if (selectedFolder) {
      setSelectedAction(action);
      setSelectedPrompt(null);
      setContent('');
      setOriginalContent('');
      setIsCreatingNew(false);
      fetchFolderState(selectedFolder, action);
    }
  };

  const handlePromptSelect = async (prompt: PromptFile) => {
    // If there are unsaved changes, set up the pending action and show confirm
    if (content !== originalContent) {
      setPendingAction(() => async () => {
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
      });
      setConfirmModal(true);
      return;
    }

    // If no unsaved changes, proceed directly
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
      await fetchFolderState(selectedFolder, selectedAction);
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
      await fetchFolderState(selectedFolder, sanitizedName);
      setIsCreatingAction(false);
      setNewActionName('');
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
      await fetchFolderState(selectedFolder, selectedAction);
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

  const handleToggleActivePrompt = async (promptPath: string, type: 'system' | 'instruction') => {
    if (!selectedFolder || !selectedAction) return;

    try {
      const response = await fetch('/api/v2/prompts/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder: selectedFolder,
          action: selectedAction,
          updates: {
            [type === 'system' ? 'activeSystemPrompt' : 'activeInstructionPrompt']: promptPath
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update active prompt');
      }

      await fetchFolderState(selectedFolder, selectedAction);
    } catch (error) {
      console.error('Error updating active prompt:', error);
    }
  };

  const handleToggleRequiresBrowser = async (value: boolean) => {
    if (!selectedFolder || !selectedAction) return;

    try {
      const response = await fetch('/api/v2/prompts/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder: selectedFolder,
          action: selectedAction,
          updates: {
            requires_browser: value
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update requires_browser setting');
      }

      await fetchFolderState(selectedFolder, selectedAction);
    } catch (error) {
      console.error('Error updating requires_browser:', error);
      toast.error('Failed to update requires_browser setting');
    }
  };

  const handleScriptSelect = async (scriptName: string) => {
    window.open(`/scripteditor?scriptname=${scriptName}`, '_blank');
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="space-y-6">
                {/* Tab Controls */}
                <div className="flex border-b border-gray-200">
                  <button
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'prompts'
                      ? 'text-gray-900 border-b-2 border-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                    onClick={() => setActiveTab('prompts')}
                  >
                    Prompts
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'scripts'
                      ? 'text-gray-900 border-b-2 border-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                    onClick={() => setActiveTab('scripts')}
                  >
                    Scripts
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'prompts' ? (
                  <>
                    <div>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <select
                            id="bot-select"
                            className="w-full px-3 py-1.5 text-base border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-transparent bg-white appearance-none text-gray-900"
                            value={selectedFolder}
                            onChange={(e) => handleFolderSelect(e.target.value)}
                          >
                            <option value="" disabled className="text-gray-500">Select Bot</option>
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
                    </div>

                    {selectedFolder && (
                      <>
                        <div>
                          <div className="flex gap-3">
                            <div className="relative flex-1">
                              <select
                                id="action-select"
                                className="w-full px-3 py-1.5 text-base border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-transparent bg-white appearance-none text-gray-900"
                                value={selectedAction}
                                onChange={(e) => handleActionSelect(e.target.value)}
                              >
                                <option value="" disabled className="text-gray-500">Select Action</option>
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
                              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              onClick={handleNewAction}
                              disabled={true}
                              title="Add Action"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                          <label className="text-base font-medium text-gray-600">Requires Browser</label>
                          <input
                            type="checkbox"
                            checked={currentAction?.requires_browser || false}
                            onChange={(e) => handleToggleRequiresBrowser(e.target.checked)}
                            className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-base font-medium text-gray-600">Prompts</label>
                            <button
                              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              onClick={handleNewPrompt}
                              disabled={isCreatingNew}
                              title="New Prompt"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </div>


                        {isCreatingNew ? (
                          <div key="create-prompt" className="mb-3">
                            <input
                              type="text"
                              className="w-full px-2.5 py-1 text-base border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-transparent mb-2"
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
                                className="px-2.5 py-1 text-base text-white bg-gray-700 rounded hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-500"
                                onClick={handleCreatePrompt}
                              >
                                Create
                              </button>
                              <button
                                className="px-2.5 py-1 text-base text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-300"
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
                                className={`px-2.5 py-1.5 text-base rounded cursor-pointer flex items-center justify-between group ${selectedPrompt?.path === prompt.path
                                  ? 'bg-gray-100 border border-gray-200'
                                  : 'hover:bg-gray-50 border border-transparent'
                                  }`}
                                onClick={() => handlePromptSelect(prompt)}
                              >
                                <span className={`${(isSystem || isInstruction) ? 'font-bold' : ''}`}>{prompt.name}</span>
                                <div className="flex gap-1">
                                  <button
                                    className={`p-1 rounded-full ${isSystem
                                      ? 'bg-green-100 text-green-600 cursor-default'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                      }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isSystem) {
                                        handleToggleActivePrompt(prompt.path, 'system');
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
                                    className={`p-1 rounded-full ${isInstruction
                                      ? 'bg-green-100 text-green-600 cursor-default'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                      }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isInstruction) {
                                        handleToggleActivePrompt(prompt.path, 'instruction');
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
                  </>
                ) : (
                  <>
                    
                    <div className="mb-4">
                      <label className="font-medium text-gray-600 block mb-1">Active Scripts</label>
                      <textarea
                        readOnly
                        value={currentAction?.prompt_scripts?.join('\n') || ''}
                        className="w-full px-2.5 py-1.5 text-base border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-transparent bg-gray-50 resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="font-medium text-gray-600 block mb-1">Scripts</label>
                      <div className="border border-gray-200 rounded overflow-hidden">
                        <div className="h-[250px] overflow-y-auto">
                          {scripts.map((script) => (
                            <div
                              key={script}
                              className={`px-2.5 py-1.5 text-base cursor-pointer hover:bg-gray-200`}
                              onClick={() => handleScriptSelect(script)}
                            >
                              {script}
                            </div>
                          ))}
                          {scripts.length === 0 && (
                            <div className="px-2.5 py-1.5 text-xs text-gray-500">
                              No scripts available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
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
                    view={{ menu: true, md: true, html: false }}
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

        <ConfirmModal
          isOpen={confirmModal}
          message="You have unsaved changes. Do you want to continue?"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </div>
    </AdminLayout>
  );
};

export default PromptsManager; 