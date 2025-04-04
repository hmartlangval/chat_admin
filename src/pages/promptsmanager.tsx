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
  const [prompts, setPrompts] = useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
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

  // Load prompts list
  useEffect(() => {
    fetchPrompts();
  }, []);

  // Load selected prompt content
  useEffect(() => {
    if (selectedPrompt) {
      fetchPromptContent(selectedPrompt);
    }
  }, [selectedPrompt]);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/v2/prompts');
      const data = await response.json();
      setPrompts(data.files);
    } catch (err) {
      setError('Failed to load prompts');
    }
  };

  const fetchPromptContent = async (filename: string) => {
    try {
      const response = await fetch(`/api/v2/prompts?filename=${filename}`);
      const data = await response.json();
      setContent(data.content);
      setOriginalContent(data.content);
    } catch (err) {
      setError('Failed to load prompt content');
    }
  };

  const handleSave = async () => {
    try {
      const filename = isCreatingNew ? 
        newPromptName.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '.md' : 
        selectedPrompt;

      await fetch('/api/v2/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          content,
        }),
      });

      if (isCreatingNew) {
        setIsCreatingNew(false);
        setNewPromptName('');
        await fetchPrompts();
        setSelectedPrompt(filename);
      }
      setOriginalContent(content);
      setError('');
    } catch (err) {
      setError('Failed to save prompt');
    }
  };

  const handleNewPrompt = () => {
    if (hasChanges) {
      setConfirmModal({
        isOpen: true,
        message: 'You have unsaved changes. Are you sure you want to create a new prompt? Your changes will be lost.',
        onConfirm: () => {
          setConfirmModal({ ...confirmModal, isOpen: false });
          setIsCreatingNew(true);
          setSelectedPrompt('');
          setContent('');
          setOriginalContent('');
        }
      });
    } else {
      setIsCreatingNew(true);
      setSelectedPrompt('');
      setContent('');
      setOriginalContent('');
    }
  };

  const handlePromptSelect = (promptName: string) => {
    if (hasChanges) {
      setConfirmModal({
        isOpen: true,
        message: 'You have unsaved changes. Are you sure you want to switch prompts? Your changes will be lost.',
        onConfirm: () => {
          setConfirmModal({ ...confirmModal, isOpen: false });
          setSelectedPrompt(promptName);
        }
      });
    } else {
      setSelectedPrompt(promptName);
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
          console.log('Reload triggered - implementation pending');
        }
      });
    } else {
      console.log('Reload triggered - implementation pending');
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
            >
              New Prompt
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!hasChanges || (isCreatingNew && !newPromptName)}
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
            value={selectedPrompt}
            onChange={(e) => handlePromptSelect(e.target.value)}
            disabled={isCreatingNew}
          >
            <option value="">Select a prompt</option>
            {prompts.map((prompt) => (
              <option key={prompt} value={prompt}>
                {prompt}
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
            config={{
              view: {
                menu: true,
                md: true,
                html: true,
              },
              canView: {
                menu: true,
                md: true,
                html: true,
                fullScreen: true,
                hideMenu: true,
              },
            }}
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