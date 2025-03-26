"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedDataRepository = void 0;
const db_1 = require("../db");
class SharedDataRepository {
    constructor() {
        this.collectionName = 'shared_data';
    }
    /**
     * Save shared data metadata to the database
     * @param data The shared data to save
     * @returns The saved document
     */
    async saveData(data) {
        const { db } = await (0, db_1.connectToDatabase)();
        const collection = db.collection(this.collectionName);
        if (data._id) {
            // Update existing document
            await collection.updateOne({ _id: data._id }, { $set: data });
            return data;
        }
        else {
            // Insert new document
            const result = await collection.insertOne(data);
            return { ...data, _id: result.insertedId };
        }
    }
    /**
     * Find shared data by its dataId
     * @param dataId The unique identifier for the data
     * @returns The shared data or null if not found
     */
    async findByDataId(dataId) {
        const { db } = await (0, db_1.connectToDatabase)();
        const collection = db.collection(this.collectionName);
        return collection.findOne({ dataId });
    }
    /**
     * Get all shared data
     * @param limit Maximum number of documents to return
     * @param skip Number of documents to skip
     * @returns Array of shared data
     */
    async getAll(limit = 100, skip = 0) {
        const { db } = await (0, db_1.connectToDatabase)();
        const collection = db.collection(this.collectionName);
        return collection.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
    }
    /**
     * Delete shared data by dataId
     * @param dataId The unique identifier for the data
     * @returns True if deleted, false if not found
     */
    async deleteByDataId(dataId) {
        const { db } = await (0, db_1.connectToDatabase)();
        const collection = db.collection(this.collectionName);
        const result = await collection.deleteOne({ dataId });
        return result.deletedCount > 0;
    }
}
exports.SharedDataRepository = SharedDataRepository;
