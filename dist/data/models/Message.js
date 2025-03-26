"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageRepository = void 0;
const db_1 = require("../db");
class MessageRepository {
    constructor() {
        this.collectionName = 'messages';
    }
    /**
     * Save a message to the database
     * @param message The message to save
     * @returns The saved message
     */
    async saveMessage(message) {
        const { db } = await (0, db_1.connectToDatabase)();
        const collection = db.collection(this.collectionName);
        // Check if message with this id already exists
        const existing = await collection.findOne({ id: message.id });
        if (existing) {
            // Update existing message
            await collection.updateOne({ id: message.id }, { $set: message });
            return message;
        }
        else {
            // Insert new message
            await collection.insertOne(message);
            return message;
        }
    }
    /**
     * Get messages for a specific channel
     * @param channelId The channel ID
     * @param limit Maximum number of messages to return
     * @param skip Number of messages to skip
     * @returns Array of messages
     */
    async getByChannel(channelId, limit = 100, skip = 0) {
        const { db } = await (0, db_1.connectToDatabase)();
        const collection = db.collection(this.collectionName);
        return collection.find({ channelId })
            .sort({ timestamp: 1 })
            .skip(skip)
            .limit(limit)
            .toArray();
    }
    /**
     * Get requests with their responses
     * @param limit Maximum number of requests to return
     * @param skip Number of requests to skip
     * @returns Array of request messages
     */
    async getRequests(limit = 50, skip = 0) {
        const { db } = await (0, db_1.connectToDatabase)();
        const collection = db.collection(this.collectionName);
        return collection.find({ requestId: { $ne: null } })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
    }
    /**
     * Get responses for a specific request
     * @param requestId The request ID
     * @returns Array of response messages
     */
    async getResponsesForRequest(requestId) {
        const { db } = await (0, db_1.connectToDatabase)();
        const collection = db.collection(this.collectionName);
        return collection.find({ parentRequestId: requestId })
            .sort({ timestamp: 1 })
            .toArray();
    }
    /**
     * Clear all messages for a channel
     * @param channelId The channel ID
     * @returns Number of messages deleted
     */
    async clearChannel(channelId) {
        const { db } = await (0, db_1.connectToDatabase)();
        const collection = db.collection(this.collectionName);
        const result = await collection.deleteMany({ channelId });
        return result.deletedCount;
    }
}
exports.MessageRepository = MessageRepository;
