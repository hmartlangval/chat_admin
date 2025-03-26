/**
 * Message Processor Utility
 * 
 * Shared utilities for processing chat messages across the application.
 * Used by both WebSocket handlers and REST API endpoints.
 */

/**
 * Extract tags from message content
 * @param content Message content
 * @returns Array of tags
 */
export function extractTags(content: string): string[] {
  const tags: string[] = [];
  const tagMatches = content.match(/@(\w+)/g);
  
  if (tagMatches) {
    tagMatches.forEach((tag: string) => {
      tags.push(tag.substring(1)); // Remove the @ symbol
    });
  }
  
  return tags;
}

/**
 * Extract dataId from message content
 * @param content Message content
 * @returns Extracted dataId or null
 */
export function extractDataId(content: string): string | null {
  const dataIdMatch = content.match(/\[dataId:\s*(\w+)\]/);
  return dataIdMatch ? dataIdMatch[1] : null;
}

/**
 * Extract requestId from message content
 * @param content Message content
 * @returns Extracted requestId or null
 */
export function extractRequestId(content: string): string | null {
  const requestIdMatch = content.match(/\[requestId:\s*(\w+)\]/);
  return requestIdMatch ? requestIdMatch[1] : null;
}

/**
 * Process message content to extract tags, dataId, and requestId
 * @param content Message content
 * @returns Object containing extracted tags, dataId, and requestId
 */
export function processMessageContent(content: string): {
  tags: string[];
  dataId: string | null;
  requestId: string | null;
} {
  return {
    tags: extractTags(content),
    dataId: extractDataId(content),
    requestId: extractRequestId(content)
  };
}

/**
 * Generate a unique message ID
 * @returns Unique message ID
 */
export function generateMessageId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Create a chat message object
 * @param channelId Channel ID
 * @param content Message content
 * @param senderId Sender ID
 * @param senderName Sender name
 * @param senderType Sender type
 * @returns Complete chat message object
 */
export function createChatMessage(
  channelId: string,
  content: string,
  senderId: string,
  senderName: string,
  senderType: string
): any {
  // Process the content
  const { tags, dataId, requestId } = processMessageContent(content);
  
  // Create and return the message object
  return {
    id: generateMessageId(),
    channelId,
    senderId,
    senderName,
    senderType,
    content,
    tags,
    dataId,
    requestId,
    timestamp: Date.now()
  };
} 