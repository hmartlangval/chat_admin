import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';

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
  const [serverStatus, setServerStatus] = useState<'initializing' | 'running' | 'error'>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentChannelId, setCurrentChannelId] = useState<string>('general');
  const [channelActive, setChannelActive] = useState<boolean>(false);
  const [messageContent, setMessageContent] = useState<string>('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState<boolean>(false);
  const [sharedData, setSharedData] = useState<SharedData | null>(null);
  const [dataModalOpen, setDataModalOpen] = useState<boolean>(false);

  // Auto-initialize the Socket.IO server on component mount
  useEffect(() => {
    const initServer = async () => {
      try {
        // Call the auto-init endpoint
        const response = await fetch('/api/auto-init');

        if (response.ok) {
          setServerStatus('running');
          setErrorMessage(null);
          console.log('Socket.IO server initialized automatically');
        } else {
          const errorData = await response.json();
          console.error('Failed to initialize Socket.IO server:', errorData);
          setServerStatus('error');
          setErrorMessage(errorData.error || 'Failed to initialize Socket.IO server');
        }
      } catch (err: any) {
        console.error('Error initializing Socket.IO server:', err);
        setServerStatus('error');
        setErrorMessage(err.message || 'Unknown error');
      }
    };

    initServer();
  }, []);

  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Detect when user scrolls the messages container
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      // Consider user scrolled if they're not at the bottom (with a small buffer)
      const isAtBottom = scrollHeight
        - scrollTop - clientHeight < 50;
      setUserScrolled(!isAtBottom);
    }
  };

  // Scroll to bottom when messages change, unless user has scrolled up
  useEffect(() => {
    if (!userScrolled) {
      scrollToBottom();
    }
  }, [messages, userScrolled]);

  // Function to periodically fetch messages and participants data
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (serverStatus === 'running') {
      // Initial fetch
      fetchChannelData();

      // Set up interval to fetch every 2 seconds
      intervalId = setInterval(fetchChannelData, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [serverStatus, currentChannelId]);

  // Function to fetch channel data (messages and participants)
  const fetchChannelData = async () => {
    try {
      // Fetch channel details
      const channelResponse = await fetch(`/api/channels/${currentChannelId}/details`);
      if (channelResponse.ok) {
        const channelData = await channelResponse.json();
        setParticipants(channelData.participants || []);
        setChannelActive(channelData.active || false);
      }

      // Fetch channel messages
      const messagesResponse = await fetch(`/api/channels/${currentChannelId}/messages`);
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        setMessages(messagesData.messages || []);
      }
    } catch (err) {
      console.error('Error fetching channel data:', err);
    }
  };

  // Function to handle channel changes
  const handleChannelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentChannelId(e.target.value);
  };

  // Function to handle channel operations
  const handleChannelOperation = async (operation: 'start' | 'stop') => {
    try {
      const response = await fetch(`/api/channels/${currentChannelId}/${operation}`, {
        method: 'POST'
      });

      if (response.ok) {
        setChannelActive(operation === 'start');
        // Refresh data
        fetchChannelData();
      } else {
        const errorText = await response.text();
        console.error(`Failed to ${operation} channel:`, errorText);
      }
    } catch (err) {
      console.error(`Error during ${operation} channel:`, err);
    }
  };

  // Function to clear chat history
  const handleClearChat = async () => {
    try {
      const response = await fetch(`/api/channels/${currentChannelId}/clear`, {
        method: 'POST'
      });

      if (response.ok) {
        // Refresh data to show empty chat
        fetchChannelData();
      } else {
        const errorText = await response.text();
        console.error('Failed to clear chat:', errorText);
      }
    } catch (err) {
      console.error('Error clearing chat:', err);
    }
  };

  // Function to send a message from the admin interface
  const handleSendMessage = async () => {
    if (!messageContent.trim() || !currentChannelId || serverStatus !== 'running') return;

    try {
      // Call API endpoint to send message
      const response = await fetch(`/api/channels/${currentChannelId}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent,
          sender: 'Admin',
        }),
      });

      if (response.ok) {
        // Clear the input after sending
        setMessageContent('');
        // Refresh messages
        fetchChannelData();
      } else {
        console.error('Failed to send message:', await response.text());
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Function to handle data reference clicks in messages
  const handleDataReferenceClick = async (dataId: string) => {
    try {
      console.log(`Fetching data with ID: ${dataId}`);
      
      const response = await fetch(`/api/data/${dataId}`);
      if (response.ok) {
        const result = await response.json();
        setSharedData(result.data);
        setDataModalOpen(true);
      } else {
        console.error('Failed to fetch shared data:', await response.text());
      }
    } catch (err) {
      console.error('Error fetching shared data:', err);
    }
  };

  // Function to render message content with data reference links
  const renderMessageContent = (content: string) => {
    // Regular expression to find data references [data_id: xxx]
    const dataRefRegex = /\[data_id:\s*([a-zA-Z0-9_]+)\]/g;
    
    // Split the content by data references
    const parts = content.split(dataRefRegex);
    
    if (parts.length <= 1) {
      // No data references, return plain text
      return content;
    }
    
    // Find all matches to extract data IDs
    const matches = Array.from(content.matchAll(dataRefRegex));
    const result = [];
    
    for (let i = 0; i < parts.length; i++) {
      // Add the text part
      if (parts[i]) {
        result.push(<span key={`text-${i}`}>{parts[i]}</span>);
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
              <div className={`h-2.5 w-2.5 rounded-full ${serverStatus === 'running' ? 'bg-green-500' : serverStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
              <span className="text-sm text-gray-600">
                {serverStatus === 'running' ? 'Server Running' : serverStatus === 'error' ? 'Server Error' : 'Initializing...'}
              </span>
            </div>
          </div>
          {errorMessage && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-2 mt-2 text-sm rounded">
              {errorMessage}
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
                {participants.length > 0 ? (
                  participants.map((participant: Participant) => (
                    <div key={participant.id} className="p-1.5 bg-gray-50 rounded text-xs">
                      <div className="font-medium">{participant.name}</div>
                      <div className="text-gray-500">{participant.type}</div>
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
                      value={currentChannelId}
                      onChange={handleChannelChange}
                    />
                  </div>
                </div>
              </div>
              <div className="flex space-x-2 ml-2">
                <button
                  onClick={handleClearChat}
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-red-500"
                >
                  Clear Chat
                </button>
                {channelActive ? (
                  <button
                    onClick={() => handleChannelOperation('stop')}
                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-yellow-500"
                    disabled={serverStatus !== 'running'}
                  >
                    Stop Channel
                  </button>
                ) : (
                  <button
                    onClick={() => handleChannelOperation('start')}
                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-green-500"
                    disabled={serverStatus !== 'running'}
                  >
                    Start Channel
                  </button>
                )}
              </div>
            </div>

            {/* Messages - Simple fixed height container with scroll */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="p-3 overflow-y-auto h-[500px]"
            >
              <div className="space-y-3">
                {messages.length > 0 ? (
                  messages.map((message: Message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === 'system' ? 'justify-center' : 'justify-start'
                        }`}
                    >
                      <div
                        className={`rounded-md px-3 py-2 ${message.senderId === 'system'
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

            {/* Admin message - make it editable for sending messages with improved styling */}
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
                      // Reset userScrolled when user sends a message
                      setUserScrolled(false);
                    }
                  }}
                  placeholder="Type a message as Admin..."
                  className="block w-full rounded-md border-2 border-gray-400 text-sm py-2 px-3 h-10 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={serverStatus !== 'running' || !channelActive}
                />
                <button
                  onClick={() => {
                    setMessageContent("@fileprep let's start fileprep process");
                    setTimeout(() => {
                      handleSendMessage();
                      setUserScrolled(false);
                      // Reset userScrolled when user sends a message
                    }, 1000);
                  }}
                  className="inline-flex items-center px-3 py-2 h-10 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500"
                >
                  Fileprep
                </button>

                <button
                  onClick={() => {
                    handleSendMessage();
                    // Reset userScrolled when user sends a message
                    setUserScrolled(false);
                  }}
                  className="inline-flex items-center px-3 py-2 h-10 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500"
                  disabled={serverStatus !== 'running' || !channelActive || !messageContent.trim()}
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