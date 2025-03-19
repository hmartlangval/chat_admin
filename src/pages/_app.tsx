import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  // Initialize the Socket.IO server as early as possible
  useEffect(() => {
    const initSocketServer = async () => {
      try {
        // Call the auto-init endpoint to initialize Socket.IO
        const response = await fetch('/api/auto-init');
        if (response.ok) {
          console.log('Socket.IO server auto-initialized on app load');
        } else {
          console.error('Failed to auto-initialize Socket.IO server on app load');
        }
      } catch (error) {
        console.error('Error initializing Socket.IO server on app load:', error);
      }
    };

    // Call initialization function
    initSocketServer();
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp; 