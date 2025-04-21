import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import MaintainanceMode from '@/components/Admin/MaintainanceMode';
import BotControl from '@/components/Admin/BotControl';

interface Command {
    id: string;
    name: string;
    command: string;
    status: 'running' | 'stopped';
    pid?: number;
}

interface Bot {
    botId: string;
    botName: string;
    status: string;
    botInstanceType: string;
    botType: string;
    options: any;
    creator: string;
    channel: string;
}

interface Notification {
    message: string;
    type: 'success' | 'error';
}

// Helper function to parse commands from environment variables
const getCommandsFromEnv = (): Command[] => {
    try {
        const commandsJson = process.env.NEXT_PUBLIC_COMMANDS;
        if (commandsJson) {
            return JSON.parse(commandsJson);
        }
    } catch (error) {
        console.error('Failed to parse commands from environment variables:', error);
    }

    // Fallback default commands
    return [
        {
            id: '1',
            name: 'Fileprep Main Service',
            command: 'D:/cursor/fileprep_prod/fileprepbot|conda activate fileprep_env|mainbot.py',
            status: 'stopped'
        },
        {
            id: '2',
            name: 'Project B Script',
            command: 'D:/project_b|venv/Scripts/activate|run.py',
            status: 'stopped'
        },
        {
            id: '3',
            name: 'Project C Script',
            command: 'E:/project_c|venv/Scripts/activate|start.py',
            status: 'stopped'
        }
    ];
};

export default function ServiceManager() {
    const [commands, setCommands] = useState<Command[]>(getCommandsFromEnv());
    const [bots, setBots] = useState<Bot[]>([]);
    const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
    const [notification, setNotification] = useState<Notification | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Show notification for 4 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Fetch bots on load
    useEffect(() => {
        const fetchBots = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/v2/bots', {
                    cache: 'no-cache'
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.bots) {
                        setBots(data.bots);
                    }
                } else {
                    console.error('Failed to fetch bots');
                    setNotification({ 
                        message: 'Failed to fetch bots. Is the bot server running?',
                        type: 'error'
                    });
                }
            } catch (error) {
                console.error('Error fetching bots:', error);
                setNotification({ 
                    message: 'Error connecting to bot server. Is it running?',
                    type: 'error'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchBots();
    }, []);

    // Check status of processes on load
    useEffect(() => {
        const checkProcessStatus = async () => {
            try {
                const response = await fetch('/api/command', {
                    cache: 'no-cache',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'status'
                    }),
                });

                const data = await response.json();
                if (data.success && data.processes) {
                    // Update command status based on running processes
                    setCommands(prev => prev.map(cmd => ({
                        ...cmd,
                        status: data.processes[cmd.id] ? 'running' : 'stopped'
                    })));
                }
            } catch (error) {
                console.error('Failed to check process status:', error);
            }
        };

        checkProcessStatus();
    }, []);

    const handleStart = async (command: Command) => {
        setLoading(prev => ({ ...prev, [command.id]: true }));
        try {
            const response = await fetch('/api/command', {
                cache: 'no-cache',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    commandId: command.id,
                    action: 'start',
                    command: command.command,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setCommands(prev =>
                    prev.map(cmd =>
                        cmd.id === command.id
                            ? { ...cmd, status: 'running', pid: data.pid }
                            : cmd
                    )
                );
                setNotification({ message: `Started ${command.name}`, type: 'success' });
            } else {
                setNotification({ message: `Failed to start ${command.name}`, type: 'error' });
            }
        } catch (error) {
            console.error('Failed to start service:', error);
            setNotification({ message: `Failed to start ${command.name}`, type: 'error' });
        } finally {
            setLoading(prev => ({ ...prev, [command.id]: false }));
        }
    };

    const handleStop = async (command: Command) => {
        setLoading(prev => ({ ...prev, [command.id]: true }));
        try {
            const response = await fetch('/api/command', {
                cache: 'no-cache',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    commandId: command.id,
                    action: 'stop',
                }),
            });

            const data = await response.json();
            if (data.success) {
                setCommands(prev =>
                    prev.map(cmd =>
                        cmd.id === command.id
                            ? { ...cmd, status: 'stopped', pid: undefined }
                            : cmd
                    )
                );
                setNotification({ message: `Stopped ${command.name}`, type: 'success' });
            } else {
                setNotification({ message: `Failed to stop ${command.name}`, type: 'error' });
            }
        } catch (error) {
            console.error('Failed to stop service:', error);
            setNotification({ message: `Failed to stop ${command.name}`, type: 'error' });
        } finally {
            setLoading(prev => ({ ...prev, [command.id]: false }));
        }
    };

    // Helper function to get script name from command
    const getScriptName = (command: string) => {
        const parts = command.split('|');
        return parts[parts.length - 1];
    };

    const hold_till_work_is_done = true;
    if (hold_till_work_is_done) {
        return (
            <AdminLayout>
                <div className="h-[calc(100vh-3rem)] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-semibold">Bot Control Panel</h1>
                        </div>
                    </div>
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    This is an adhoc solution to fix service bots freezing up or not responding (in case it occurs). You can always <b>try Cancelling tasks</b> first from the main screen by clicking on the respective bot name on the left column. If bot still fails to co-operate, you may use the controls to stop/start/restart.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-white rounded-lg shadow p-6">
                        {notification && (
                            <div className={`notification ${notification.type}`}>
                                {notification.message}
                            </div>
                        )}
                        
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="loader"></div>
                                <p className="ml-3">Loading bots...</p>
                            </div>
                        ) : bots.length === 0 ? (
                            <div className="text-center p-8">
                                <p>No bots found. Is the bot server running?</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {bots.map(bot => (
                                    <div key={bot.botId} className="bot-card">
                                        <h3 className="text-lg font-medium mb-3">{bot.botName}</h3>
                                        <div className="text-sm text-gray-500 mb-3">
                                            <p>Type: {bot.botType}</p>
                                            <p>Instance: {bot.botInstanceType}</p>
                                        </div>
                                        <BotControl
                                            botId={bot.botId}
                                            botName={bot.botName}
                                            initialStatus={bot.status}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <style jsx>{`
                    .notification {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 10px 15px;
                        border-radius: 4px;
                        color: white;
                        font-size: 14px;
                        z-index: 1000;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                    }

                    .notification.success {
                        background-color: #0078d4;
                        border-left: 4px solid #106ebe;
                    }

                    .notification.error {
                        background-color: #a4262c;
                        border-left: 4px solid #8e1b21;
                    }
                    
                    .bot-card {
                        background-color: #f9f9f9;
                        border-radius: 8px;
                        padding: 16px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                    }
                    
                    .loader {
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #3498db;
                        border-radius: 50%;
                        width: 30px;
                        height: 30px;
                        animation: spin 1s linear infinite;
                    }
                    
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="h-[calc(100vh-3rem)] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-semibold">Service Manager</h1>
                    </div>
                </div>
                
                <div className="flex-1 bg-white rounded-lg shadow p-6">
                    {notification && (
                        <div className={`notification ${notification.type}`}>
                            {notification.message}
                        </div>
                    )}

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Script</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {commands.map(command => (
                                    <tr key={command.id}>
                                        <td>{command.name}</td>
                                        <td>{getScriptName(command.command)}</td>
                                        <td>
                                            <span className={`status ${command.status}`}>
                                                {command.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="actions">
                                                <button
                                                    className={`button ${command.status === 'running' ? 'disabled' : 'primary'}`}
                                                    onClick={() => handleStart(command)}
                                                    disabled={command.status === 'running' || loading[command.id]}
                                                >
                                                    {loading[command.id] ? 'Starting...' : 'Start'}
                                                </button>
                                                <button
                                                    className={`button ${command.status === 'stopped' ? 'disabled' : 'danger'}`}
                                                    onClick={() => handleStop(command)}
                                                    disabled={command.status === 'stopped' || loading[command.id]}
                                                >
                                                    {loading[command.id] ? 'Stopping...' : 'Stop'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .table-container {
                    overflow-x: auto;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }

                th, td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }

                th {
                    background-color: #f5f5f5;
                    font-weight: bold;
                }

                .status {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.9em;
                }

                .status.running {
                    background-color: #e6f7e6;
                    color: #52c41a;
                }

                .status.stopped {
                    background-color: #fff1f0;
                    color: #ff4d4f;
                }

                .actions {
                    display: flex;
                    gap: 8px;
                }

                .button {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }

                .button.primary {
                    background-color: #1890ff;
                    color: white;
                }

                .button.danger {
                    background-color: #ff4d4f;
                    color: white;
                }

                .button.disabled {
                    background-color: #d9d9d9;
                    cursor: not-allowed;
                }

                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 10px 15px;
                    border-radius: 4px;
                    color: white;
                    font-size: 14px;
                    z-index: 1000;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                }

                .notification.success {
                    background-color: #0078d4;
                    border-left: 4px solid #106ebe;
                }

                .notification.error {
                    background-color: #a4262c;
                    border-left: 4px solid #8e1b21;
                }
            `}</style>
        </AdminLayout>
    );
} 