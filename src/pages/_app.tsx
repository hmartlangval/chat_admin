import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { LoadingProvider } from '@/contexts/LoadingContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <LoadingProvider>
      <WebSocketProvider>
        <Component {...pageProps} />
      </WebSocketProvider>
    </LoadingProvider>
  );
}

export default MyApp; 