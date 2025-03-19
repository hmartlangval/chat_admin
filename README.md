# Chat Service Frontend

This is the NextJS frontend for the chat service application. It provides a user interface for interacting with the chat service backend.

## Features

- Start/stop conversation channel
- Real-time message updates via WebSockets
- Clean, responsive UI

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Run the development server:
   ```
   npm run dev
   ```

3. Build for production:
   ```
   npm run build
   ```

4. Start the production server:
   ```
   npm start
   ```

The frontend will be available at http://localhost:3000

## Project Structure

- `src/` - Source code
  - `components/` - React components
    - `Channel/` - Channel-related components
    - `Conversation/` - Conversation display components
    - `UI/` - Reusable UI components
  - `pages/` - Next.js pages
  - `styles/` - Global styles
  - `utils/` - Utility functions