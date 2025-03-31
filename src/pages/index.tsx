import React, { useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import { StartTaskButtonBasic } from '../components/StartTaskButtonBasic';
import { useWebSocket } from '../contexts/WebSocketContext';

// Define message type for admin UI
interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderType: string;
  content: string;
  tags: string[];
  timestamp: number;
}

// Define participant type for admin UI
interface Participant {
  id: string;
  name: string;
  type: string;
}

// Define shared data type
interface SharedData {
  id: string;
  type: 'string' | 'image' | 'document' | 'json';
  content: string;
  timestamp: number;
  error?: string;
}

export default function Home() {
  // WebSocket context
  const { 
    messages, 
    channelStatus, 
    activeChannel,
    sendMessage, 
    switchChannel,
    startChannel,
    stopChannel,
    isConnected,
    error: wsError,
    clearMessages
  } = useWebSocket();

  // UI-specific state
  const [messageContent, setMessageContent] = useState<string>('');
  const [sharedData, setSharedData] = useState<SharedData | null>(null);
  const [dataModalOpen, setDataModalOpen] = useState<boolean>(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState<boolean>(false);

  // Scroll handling
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setUserScrolled(!isAtBottom);
    }
  };

  // Scroll to bottom when messages change, unless user has scrolled up
  React.useEffect(() => {
    if (!userScrolled) {
      scrollToBottom();
    }
  }, [messages, userScrolled]);

  // Handle channel change
  const handleChannelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    switchChannel(e.target.value);
  };

  // Handle channel operations
  const handleChannelOperation = (operation: 'start' | 'stop') => {
    if (operation === 'start') {
      startChannel();
    } else {
      stopChannel();
    }
  };

  // Handle message send
  const handleSendMessage = () => {
    if (!messageContent.trim() || !isConnected) return;
    fetch(`/api/channels/${activeChannel}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelId: activeChannel,
        content: messageContent,
        senderName: 'Admin', // Replace with the desired sender name
      }),
    })
    .then(response => response.json())
    .then(data => {
      console.log('Message sent:', data);
    })
    .catch(error => {
      console.error('Error sending message:', error);
    });
    setMessageContent('');
    setUserScrolled(false);
  };

  // Handle data reference clicks
  const handleDataReferenceClick = async (dataId: string) => {
    try {
      const response = await fetch(`/api/data/${dataId}`);
      if (response.ok) {
        const result = await response.json();
        setSharedData(result.data);
        setDataModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching shared data:', err);
    }
  };

  // Render message content with data reference links
  const renderMessageContent = (content: string) => {
    // First check for data references [id: xxx]
    const dataRefRegex = /\[id:\s*([a-zA-Z0-9_]+)\]/g;
    const dataRefParts = content.split(dataRefRegex);
    
    // If there are no data references, check for JSON content
    if (dataRefParts.length <= 1) {
      // Check for JSON tags [json]...[/json]
      const jsonRegex = /\[json\]([\s\S]*?)\[\/json\]/g;
      if (content.match(jsonRegex)) {
        // Process JSON content
        let processedContent = content;
        let match;
        let index = 0;
        const jsonSegments: Record<string, any> = {};
        
        // Reset regex state
        jsonRegex.lastIndex = 0;
        
        while ((match = jsonRegex.exec(content)) !== null) {
          try {
            const fullMatch = match[0];
            const jsonContent = match[1];
            const jsonData = JSON.parse(jsonContent);
            const jsonId = `inline-json-${index++}`;
            
            // Store the parsed JSON
            jsonSegments[jsonId] = jsonData;
            
            // Replace the JSON block with a placeholder
            processedContent = processedContent.replace(
              fullMatch,
              `[json-view id="${jsonId}"]`
            );
          } catch (err) {
            console.error('Error parsing inline JSON:', err);
          }
        }
        
        // If we processed any JSON, render with the JsonViewButton components
        if (Object.keys(jsonSegments).length > 0) {
          const parts = processedContent.split(/(\[json-view id="[^"]+"\])/);
          return parts.map((part, idx) => {
            const placeholderMatch = part.match(/\[json-view id="([^"]+)"\]/);
            if (placeholderMatch && placeholderMatch[1] && jsonSegments[placeholderMatch[1]]) {
              return (
                <button
                  key={idx}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 mx-1"
                  onClick={() => {
                    setSharedData({
                      id: placeholderMatch[1],
                      type: 'json',
                      content: JSON.stringify(jsonSegments[placeholderMatch[1]], null, 2),
                      timestamp: Date.now()
                    });
                    setDataModalOpen(true);
                  }}
                >
                  View JSON
                </button>
              );
            }
            return part ? <span key={idx}>{part}</span> : null;
          });
        }
      }
      
      // If no special content found, return plain text
      return content;
    }
    
    // Process data references
    const matches = Array.from(content.matchAll(dataRefRegex));
    const result = [];
    
    for (let i = 0; i < dataRefParts.length; i++) {
      // Add the text part
      if (dataRefParts[i]) {
        result.push(<span key={`text-${i}`}>{dataRefParts[i]}</span>);
      }
      
      // Add the data reference link if there's a corresponding match
      const matchIndex = Math.floor(i / 2);
      if (matches[matchIndex]) {
        const dataId = matches[matchIndex][1];
        result.push(
          <button
            key={`data-${i}`}
            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 mx-1"
            onClick={() => handleDataReferenceClick(dataId)}
          >
            View Shared Data
          </button>
        );
      }
    }
    
    return result;
  };

  // Data modal component
  const DataModal = ({ data, onClose }: { data: SharedData, onClose: () => void }) => {
    if (!data) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium">Shared Data</h3>
            <button 
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-4 flex-1 overflow-auto">
            {data.type === 'image' ? (
              <div className="flex justify-center">
                <img 
                  src={data.content.startsWith('data:') ? data.content : `/api/data/${data.id}`} 
                  alt="Shared Image" 
                  className="max-w-full max-h-[60vh] object-contain" 
                />
              </div>
            ) : data.type === 'json' ? (
              <pre className="bg-gray-50 p-4 rounded overflow-auto whitespace-pre-wrap">
                {JSON.stringify(JSON.parse(data.content), null, 2)}
              </pre>
            ) : (
              <div className="whitespace-pre-wrap break-all">
                {data.content}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t">
            <div className="text-xs text-gray-500">
              Type: {data.type} • Shared at: {new Date(data.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Chat Server Admin</title>
        <meta name="description" content="Chat Server Admin Interface" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto px-2 py-3 max-w-7xl">
        <header className="bg-white shadow-sm rounded-md p-3 mb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">Chat Server Admin</h1>
            <div className="flex items-center space-x-2">
              <StartTaskButtonBasic
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500"
                isChannelActive={channelStatus.active}
              />
              <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          {wsError && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-2 mt-2 text-sm rounded">
              {wsError.message}
            </div>
          )}
        </header>

        <div className="grid grid-cols-12 gap-3">
          {/* Left Sidebar - Bot Information & Participants */}
          <div className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="bg-white shadow-sm rounded-md p-3 mb-3">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Bot Information</h2>
              <div className="space-y-3 text-xs">
                <div className="border-l-2 border-blue-500 pl-2">
                  <h3 className="font-medium text-gray-800">Server Bot</h3>
                  <p className="text-gray-600 text-xs">
                    Initiates conversations and responds to all messages.
                  </p>
                  <p className="text-gray-500 mt-1 text-xs">
                    <code>cd bots/server-bot && npm start</code>
                  </p>
                </div>

                <div className="border-l-2 border-green-500 pl-2">
                  <h3 className="font-medium text-gray-800">User Bot</h3>
                  <p className="text-gray-600 text-xs">
                    Responds only when tagged in messages.
                  </p>
                  <p className="text-gray-500 mt-1 text-xs">
                    <code>cd bots/user-bot && npm start</code>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-md p-3">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Participants</h2>
              <div className="space-y-1.5">
                {channelStatus.participants.length > 0 ? (
                  channelStatus.participants.map((participant) => (
                    <div key={participant.id} className="p-1.5 bg-gray-50 rounded text-xs">
                      <div className="font-medium">{participant.name}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-xs">No participants yet</div>
                )}
              </div>
            </div>
          </div>

          {/* Center Area - Chat View */}
          <div className="col-span-12 md:col-span-9 lg:col-span-10 bg-white shadow-sm rounded-md flex flex-col">
            {/* Channel Controls */}
            <div className="border-b p-3 flex items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="flex items-center space-x-2">
                  <label htmlFor="channelId" className="block text-xs font-medium text-gray-700 whitespace-nowrap">
                    Channel:
                  </label>
                  <div className="flex-1">
                    <input
                      type="text"
                      name="channelId"
                      id="channelId"
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full rounded-md text-sm border-gray-300 h-8"
                      value={activeChannel}
                      onChange={handleChannelChange}
                    />
                  </div>
                </div>
              </div>
              <div className="flex space-x-2 ml-2">
                <button
                  onClick={clearMessages}
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-red-500"
                >
                  Clear Chat
                </button>
                {channelStatus.active ? (
                  <button
                    onClick={() => handleChannelOperation('stop')}
                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-yellow-500"
                    disabled={!isConnected}
                  >
                    Stop Channel
                  </button>
                ) : (
                  <button
                    onClick={() => handleChannelOperation('start')}
                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-green-500"
                    disabled={!isConnected}
                  >
                    Start Channel
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="p-3 overflow-y-auto h-[500px]"
            >
              <div className="space-y-3">
                {messages.length > 0 ? (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === 'system' ? 'justify-center' : 'justify-start'}`}
                    >
                      <div
                        className={`rounded-md px-3 py-2 ${
                          message.senderId === 'system'
                            ? 'bg-gray-100 text-gray-800 text-xs max-w-md mx-auto'
                            : message.senderType === 'server'
                              ? 'bg-blue-50 text-gray-800 max-w-3xl'
                              : 'bg-green-50 text-gray-800 max-w-3xl'
                        }`}
                      >
                        {message.senderId !== 'system' ? (
                          <div className="text-sm whitespace-pre-line">
                            <span className="font-bold text-gray-700 mr-2">{message.senderName}:</span>
                            {renderMessageContent(message.content)}
                          </div>
                        ) : (
                          <div className="text-sm whitespace-pre-line">{renderMessageContent(message.content)}</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 text-sm">No messages yet</div>
                )}
              </div>
            </div>

            {/* Message Input */}
            <div className="border-t p-3">
              <div className="flex items-center space-x-2">
                <input
                  id="messageInput"
                  type="text"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message as Admin..."
                  className="block w-full rounded-md border-2 border-gray-400 text-sm py-2 px-3 h-10 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={!isConnected || !channelStatus.active}
                />
                <button
                  onClick={() => {
                    setMessageContent("@fileprep let's start fileprep process");
                    setTimeout(() => {
                      handleSendMessage();
                    }, 1000);
                  }}
                  className="inline-flex items-center px-3 py-2 h-10 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500"
                >
                  Fileprep
                </button>

                <button
                  onClick={handleSendMessage}
                  className="inline-flex items-center px-3 py-2 h-10 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500"
                  disabled={!isConnected || !channelStatus.active || !messageContent.trim()}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data view modal */}
      {dataModalOpen && sharedData && (
        <DataModal 
          data={sharedData} 
          onClose={() => {
            setDataModalOpen(false);
            setSharedData(null);
          }}
        />
      )}
    </div>
  );
} 