import React, { useEffect, useState } from 'react';
import MarkdownIt from 'markdown-it';
import MdEditor from 'react-markdown-editor-lite';
import AdminLayout from '@/components/layout/AdminLayout';
import 'react-markdown-editor-lite/lib/index.css';

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

interface FolderContent {
  folder: string;
  prompts: PromptFile[];
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
            className="px-4 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default function PromptsManager() {
  const [folders, setFolders] = useState<FolderContent[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptFile | null>(null);
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [error, setError] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  // Load folders and prompts
  useEffect(() => {
    fetchFolders();
  }, []);

  // Load selected prompt content
  useEffect(() => {
    if (selectedPrompt) {
      fetchPromptContent(selectedPrompt.path);
    }
  }, [selectedPrompt]);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/v2/prompts');
      const data = await response.json();
      
      // Add default prompts to each folder if they don't exist
      const foldersWithDefaults = (data.folders || []).map((folder: FolderContent) => ({
        ...folder,
        prompts: [
          // Add system_prompt.md if it doesn't exist
          ...(folder.prompts.some((p: PromptFile) => p.name === 'system_prompt.md') ? [] : [{
            name: 'system_prompt.md',
            path: `${folder.folder}/system_prompt.md`,
            type: 'system' as const
          }]),
          // Add instructions.md if it doesn't exist
          ...(folder.prompts.some((p: PromptFile) => p.name === 'instructions.md') ? [] : [{
            name: 'instructions.md',
            path: `${folder.folder}/instructions.md`,
            type: 'instruction' as const
          }]),
          // Include existing prompts
          ...folder.prompts
        ]
      }));

      setFolders(foldersWithDefaults);
    } catch (err) {
      setError('Failed to load folders');
    }
  };

  const fetchPromptContent = async (path: string) => {
    try {
      const tpath = path.replace("//", "/").replace('\\', '/');
      const response = await fetch(`/api/v2/prompts?folder=${tpath.split('/')[0]}&filename=${tpath.split('/')[1]}`);
      if(response.status === 404) {
        setContent("");
        setOriginalContent("");
        return;
      }
      const data = await response.json();
      setContent(data.content);
      setOriginalContent(data.content);
    } catch (err) {
      setError('Failed to load prompt content');
    }
  };

  const handleSave = async () => {
    try {
      if (!selectedFolder) {
        setError('Please select a folder first');
        return;
      }

      const filename = isCreatingNew ? 
        newPromptName.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '.md' : 
        selectedPrompt?.name;

      await fetch('/api/v2/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder: selectedFolder,
          filename,
          content,
        }),
      });

      if (isCreatingNew) {
        setIsCreatingNew(false);
        setNewPromptName('');
        await fetchFolders();
        // Select the newly created prompt
        const newPrompt = folders
          .find(f => f.folder === selectedFolder)
          ?.prompts.find(p => p.name === filename);
        if (newPrompt) {
          setSelectedPrompt(newPrompt);
        }
      }
      setOriginalContent(content);
      setError('');
    } catch (err) {
      setError('Failed to save prompt');
    }
  };

  const handleNewPrompt = () => {
    if (!selectedFolder) {
      setError('Please select a folder first');
      return;
    }

    if (hasChanges) {
      setConfirmModal({
        isOpen: true,
        message: 'You have unsaved changes. Are you sure you want to create a new prompt? Your changes will be lost.',
        onConfirm: () => {
          setConfirmModal({ ...confirmModal, isOpen: false });
          setIsCreatingNew(true);
          setSelectedPrompt(null);
          setContent('');
          setOriginalContent('');
        }
      });
    } else {
      setIsCreatingNew(true);
      setSelectedPrompt(null);
      setContent('');
      setOriginalContent('');
    }
  };

  const handlePromptSelect = (prompt: PromptFile) => {
    if (hasChanges) {
      setConfirmModal({
        isOpen: true,
        message: 'You have unsaved changes. Are you sure you want to switch prompts? Your changes will be lost.',
        onConfirm: () => {
          setConfirmModal({ ...confirmModal, isOpen: false });
          setSelectedPrompt(prompt);
        }
      });
    } else {
      setSelectedPrompt(prompt);
    }
  };

  const handleEditorChange = ({ text }: { text: string }) => {
    setContent(text);
  };

  const handleReload = async () => {
    if (hasChanges) {
      setConfirmModal({
        isOpen: true,
        message: 'You have unsaved changes. Are you sure you want to reload? Your changes will be lost.',
        onConfirm: () => {
          setConfirmModal({ ...confirmModal, isOpen: false });
          fetchFolders();
        }
      });
    } else {
      fetchFolders();
    }
  };

  const hasChanges = content !== originalContent || isCreatingNew;

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-3rem)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Prompts Manager</h1>
            <button
              onClick={handleNewPrompt}
              className="bg-[#FF9900] text-white px-4 py-1.5 rounded hover:bg-[#F08700] text-sm font-medium"
              disabled={!selectedFolder}
            >
              New Prompt
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!hasChanges || (isCreatingNew && !newPromptName) || !selectedFolder}
              className="min-w-[100px] bg-gray-700 text-white px-6 py-1.5 rounded hover:bg-gray-800 disabled:bg-gray-300 text-sm"
            >
              Save
            </button>
            <button
              onClick={handleReload}
              className="bg-gray-700 text-white px-4 py-1.5 rounded hover:bg-gray-800 text-sm"
            >
              Reload
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 mb-3">
          <select
            className="flex-1 px-3 py-1.5 border rounded text-sm bg-white"
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
          >
            <option value="">Select a folder</option>
            {folders.map((folder) => (
              <option key={folder.folder} value={folder.folder}>
                {folder.folder}
              </option>
            ))}
          </select>

          <select
            className="flex-1 px-3 py-1.5 border rounded text-sm bg-white"
            value={selectedPrompt?.path || ''}
            onChange={(e) => {
              const prompt = folders
                .find(f => f.folder === selectedFolder)
                ?.prompts.find(p => p.path === e.target.value);
              if (prompt) {
                handlePromptSelect(prompt);
              }
            }}
            disabled={!selectedFolder || isCreatingNew}
          >
            <option value="">Select a prompt</option>
            {selectedFolder && folders
              .find(f => f.folder === selectedFolder)
              ?.prompts.map((prompt) => (
                <option key={prompt.path} value={prompt.path}>
                  {prompt.name} ({prompt.type})
                </option>
              ))}
          </select>
        </div>

        {isCreatingNew && (
          <div className="mb-3">
            <input
              type="text"
              placeholder="Enter prompt name (a-z, 0-9, underscore)"
              className="w-full px-3 py-1.5 border rounded text-sm"
              value={newPromptName}
              onChange={(e) => setNewPromptName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            />
          </div>
        )}

        <div className="flex-1 min-h-0">
          <MdEditor
            value={content}
            renderHTML={text => mdParser.render(text)}
            onChange={handleEditorChange}
            style={{ height: '100%' }}
          />
        </div>

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        />
      </div>
    </AdminLayout>
  );
} 