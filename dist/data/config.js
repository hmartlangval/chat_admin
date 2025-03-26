"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConfig = void 0;
/**
 * Database configuration settings
 * Values are read from environment variables with sensible defaults
 */
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.dbConfig = {
    // MongoDB connection URI
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    // Database name
    dbName: process.env.MONGODB_DB || 'chat_admin',
    // Connection options
    options: {
        useUnifiedTopology: true,
        maxPoolSize: 10,
        minPoolSize: 1,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000,
    },
    // Collection names
    collections: {
        messages: 'messages',
        channels: 'channels',
        sharedData: 'shared_data',
    }
};
