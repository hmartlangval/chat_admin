import { useState, useEffect } from 'react';
import axios from 'axios';
import FileList from '../components/FileList';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
  url?: string;
  children?: FileItem[];
}

const FileBrowser = () => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const fetchDirectory = async (path: string = '') => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/files?path=${encodeURIComponent(path)}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch directory contents:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = async (file: FileItem) => {
    if (expandedFolders.has(file.path)) {
      // Collapse folder
      const newExpanded = new Set(expandedFolders);
      newExpanded.delete(file.path);
      setExpandedFolders(newExpanded);
    } else {
      // Expand folder
      const newExpanded = new Set(expandedFolders);
      newExpanded.add(file.path);
      setExpandedFolders(newExpanded);

      // Fetch folder contents if not already loaded
      if (!file.children) {
        const data = await fetchDirectory(file.path);
        const updatedFiles = files.map(f => {
          if (f.path === file.path) {
            return { ...f, children: data };
          }
          return f;
        });
        setFiles(updatedFiles);
      }
    }
  };

  const handleDownload = async (filePath: string) => {
    try {
      const response = await axios.get(`/api/files?path=${encodeURIComponent(filePath)}&download=true`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filePath.split('/').pop() || 'file');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const handleDownloadDirectory = async (dirPath: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/files?path=${encodeURIComponent(dirPath)}&zip=true`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${dirPath.split('/').pop() || 'directory'}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download directory:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderFileItem = (file: FileItem, level: number = 0) => {
    const isExpanded = expandedFolders.has(file.path);
    
    return (
      <div key={file.path}>
        <div 
          className={`px-6 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between text-sm ${
            file.isDirectory ? 'bg-yellow-50 hover:bg-yellow-100' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 24}px` }}
          onClick={() => {
            if (file.isDirectory) {
              handleFolderClick(file);
            } else if (file.url) {
              window.open(file.url, '_blank');
            }
          }}
        >
          <div className="flex items-center space-x-3">
            {file.isDirectory ? (
              <svg 
                className={`h-5 w-5 text-yellow-500 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M9 5l7 7-7 7"
                />
              </svg>
            ) : (
              <svg 
                className="h-5 w-5 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            )}
            <span className={`${file.isDirectory ? 'text-yellow-800 font-medium' : 'text-gray-900'}`}>
              {file.name}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span>{formatDate(file.modified)}</span>
            </div>
            <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
              {file.isDirectory ? (
                <button
                  onClick={() => handleDownloadDirectory(file.path)}
                  className="text-gray-500 hover:text-purple-600 p-1"
                  title="Download as ZIP"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              ) : (
                <>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-blue-600 p-1"
                    title="Open file"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </a>
                  <button
                    onClick={() => handleDownload(file.path)}
                    className="text-gray-500 hover:text-green-600 p-1"
                    title="Download file"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {file.isDirectory && isExpanded && file.children && (
          <div>
            {file.children.map(child => renderFileItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const init = async () => {
      const data = await fetchDirectory();
      setFiles(data);
    };
    init();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-medium text-gray-900">File Browser</h1>
          </div>
          
          {/* Breadcrumb */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center text-sm">
              <button 
                onClick={() => {
                  setCurrentPath('');
                  setExpandedFolders(new Set());
                  const init = async () => {
                    const data = await fetchDirectory();
                    setFiles(data);
                  };
                  init();
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Root
              </button>
              {currentPath && (
                <>
                  <span className="text-gray-400 mx-2">{'>'}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">{currentPath}</span>
                    <button
                      onClick={() => handleDownloadDirectory(currentPath)}
                      className="text-gray-500 hover:text-purple-600 p-1"
                      title="Download current folder as ZIP"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* File list */}
          <FileList
            items={files}
            onFolderClick={handleFolderClick}
            onFileDownload={handleDownload}
            onFolderDownload={handleDownloadDirectory}
            expandedFolders={expandedFolders}
          />
        </div>
      </div>
    </div>
  );
};

export default FileBrowser; 