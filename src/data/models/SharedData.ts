import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../db';

export interface SharedDataModel {
  _id?: ObjectId;
  dataId: string;
  type: string;
  filePath: string;
  metadata?: {
    filename?: string;
    contentType?: string;
    size?: number;
  };
  senderId: string;
  createdAt: number;
}

export class SharedDataRepository {
  private collectionName = 'shared_data';
  
  /**
   * Save shared data metadata to the database
   * @param data The shared data to save
   * @returns The saved document
   */
  async saveData(data: SharedDataModel): Promise<SharedDataModel> {
    const { db } = await connectToDatabase();
    const collection = db.collection<SharedDataModel>(this.collectionName);
    
    if (data._id) {
      // Update existing document
      await collection.updateOne(
        { _id: data._id },
        { $set: data }
      );
      return data;
    } else {
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
  async findByDataId(dataId: string): Promise<SharedDataModel | null> {
    const { db } = await connectToDatabase();
    const collection = db.collection<SharedDataModel>(this.collectionName);
    
    return collection.findOne({ dataId });
  }
  
  /**
   * Get all shared data
   * @param limit Maximum number of documents to return
   * @param skip Number of documents to skip
   * @returns Array of shared data
   */
  async getAll(limit: number = 100, skip: number = 0): Promise<SharedDataModel[]> {
    const { db } = await connectToDatabase();
    const collection = db.collection<SharedDataModel>(this.collectionName);
    
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
  async deleteByDataId(dataId: string): Promise<boolean> {
    const { db } = await connectToDatabase();
    const collection = db.collection<SharedDataModel>(this.collectionName);
    
    const result = await collection.deleteOne({ dataId });
    return result.deletedCount > 0;
  }
} 