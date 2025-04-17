import React, { useState, useEffect } from 'react';

interface BotInfo {
  botId: string;
  botName: string;
  status: string;
  botInstanceType: string;
  botType: string;
  // Add other properties as needed
}

interface BotControlProps {
  botId: string;
  botName: string;
  initialStatus?: string;
  onStatusChange?: (status: string) => void;
}

interface Notification {
  message: string;
  type: 'success' | 'error';
}

const BotControl: React.FC<BotControlProps> = ({
  botId,
  botName,
  initialStatus = 'inactive',
  onStatusChange
}) => {
  const [status, setStatus] = useState<string>(initialStatus);
  const [loading, setLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);

  // Fetch bot status on mount
  useEffect(() => {
    fetchBotStatus();
  }, [botId]);
  
  // Fetch the status of the bot
  const fetchBotStatus = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/bots/${botId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.bot) {
          setBotInfo(data.bot);
          setStatus(data.bot.status);
          onStatusChange?.(data.bot.status);
        }
      } else {
        console.error(`Failed to fetch status for bot ${botId}`);
      }
    } catch (error) {
      console.error(`Error fetching bot status for ${botId}:`, error);
    }
  };

  // Show notification for 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleStart = async () => {
    setLoading('start');
    try {
      const response = await fetch(`http://localhost:5000/api/bots/${botId}/start`, {
        method: 'POST',
      });
      
      const data = await response.json();
      if (data.success) {
        setStatus('active');
        setNotification({ message: `Started ${botName}`, type: 'success' });
        onStatusChange?.('active');
        // Refresh bot status
        fetchBotStatus();
      } else {
        setNotification({ message: `Failed to start ${botName}`, type: 'error' });
      }
    } catch (error) {
      console.error(`Failed to start ${botName}:`, error);
      setNotification({ message: `Failed to start ${botName}`, type: 'error' });
    } finally {
      setLoading(null);
    }
  };

  const handleStop = async () => {
    setLoading('stop');
    try {
      const response = await fetch(`http://localhost:5000/api/bots/${botId}/stop`, {
        method: 'POST',
      });
      
      const data = await response.json();
      if (data.success) {
        setStatus('inactive');
        setNotification({ message: `Stopped ${botName}`, type: 'success' });
        onStatusChange?.('inactive');
        // Refresh bot status
        fetchBotStatus();
      } else {
        setNotification({ message: `Failed to stop ${botName}`, type: 'error' });
      }
    } catch (error) {
      console.error(`Failed to stop ${botName}:`, error);
      setNotification({ message: `Failed to stop ${botName}`, type: 'error' });
    } finally {
      setLoading(null);
    }
  };

  const handleRestart = async () => {
    setLoading('restart');
    try {
      const response = await fetch(`http://localhost:5000/api/bots/${botId}/restart`, {
        method: 'POST',
      });
      
      const data = await response.json();
      if (data.success) {
        setStatus('active');
        setNotification({ message: `Restarted ${botName}`, type: 'success' });
        onStatusChange?.('active');
        // Refresh bot status
        fetchBotStatus();
      } else {
        setNotification({ message: `Failed to restart ${botName}`, type: 'error' });
      }
    } catch (error) {
      console.error(`Failed to restart ${botName}:`, error);
      setNotification({ message: `Failed to restart ${botName}`, type: 'error' });
    } finally {
      setLoading(null);
    }
  };

  // Map API status to display status
  const getStatusDisplay = () => {
    switch (status) {
      case 'active':
        return 'ACTIVE';
      case 'inactive':
        return 'INACTIVE';
      default:
        return status.toUpperCase();
    }
  };

  // Map status to CSS class
  const getStatusClass = () => {
    switch (status) {
      case 'active':
        return 'running';
      case 'inactive':
        return 'stopped';
      default:
        return 'unknown';
    }
  };

  return (
    <div className="bot-control">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <div className="status-indicator">
        <span className={`status ${getStatusClass()}`}>
          {getStatusDisplay()}
        </span>
      </div>

      <div className="actions">
        {status !== 'active' ? (
          <button
            className={`button primary`}
            onClick={handleStart}
            disabled={loading !== null}
          >
            {loading === 'start' ? 'Starting...' : 'Start'}
          </button>
        ) : (
          <button
            className={`button danger`}
            onClick={handleStop}
            disabled={loading !== null}
          >
            {loading === 'stop' ? 'Stopping...' : 'Stop'}
          </button>
        )}
        
        <button
          className={`button secondary`}
          onClick={handleRestart}
          disabled={loading !== null}
        >
          {loading === 'restart' ? 'Restarting...' : 'Restart'}
        </button>
      </div>

      <style jsx>{`
        .bot-control {
          position: relative;
        }
        
        .status-indicator {
          margin-bottom: 10px;
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
        
        .status.unknown {
          background-color: #fff7e6;
          color: #fa8c16;
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

        .button.secondary {
          background-color: #722ed1;
          color: white;
        }

        .button:disabled {
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
    </div>
  );
};

export default BotControl; 