"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
exports.closeConnection = closeConnection;
const mongodb_1 = require("mongodb");
const config_1 = require("./config");
// Connection URL and options from config
const url = config_1.dbConfig.mongoUri;
const dbName = config_1.dbConfig.dbName;
const options = config_1.dbConfig.options;
let cachedClient = null;
let cachedDb = null;
/**
 * Connect to MongoDB and return the client and database objects
 * Uses a connection cache to avoid creating multiple connections
 */
async function connectToDatabase() {
    // If we have cached connections, use them
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }
    try {
        // Connect to MongoDB
        const client = await mongodb_1.MongoClient.connect(url);
        const db = client.db(dbName);
        // Cache the client and db connection
        cachedClient = client;
        cachedDb = db;
        console.log('Connected to MongoDB');
        return { client, db };
    }
    catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
    }
}
/**
 * Close MongoDB connection
 * Useful for cleanup during testing or server shutdown
 */
async function closeConnection() {
    if (cachedClient) {
        await cachedClient.close();
        cachedClient = null;
        cachedDb = null;
        console.log('MongoDB connection closed');
    }
}
