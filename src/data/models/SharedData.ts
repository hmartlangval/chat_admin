import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../db';
import { SharedDataModel } from '../../types/shared-data';

export class SharedDataRepository {
  private collectionName = 'shared_data';
  
  /**
   * Save shared data metadata to the database
   * @param data The data to save
   * @returns The saved data
   */
  async saveData(data: SharedDataModel): Promise<SharedDataModel> {
    const { db } = await connectToDatabase();
    const collection = db.collection<SharedDataModel>(this.collectionName);
    
    // Check if data with this ID already exists
    const existing = await collection.findOne({ dataId: data.dataId });
    
    if (existing) {
      // Update existing data
      await collection.updateOne(
        { dataId: data.dataId },
        { $set: data }
      );
      return data;
    } else {
      // Insert new data
      await collection.insertOne(data);
      return data;
    }
  }
  
  /**
   * Get shared data by ID
   * @param dataId The data ID
   * @returns The shared data or null if not found
   */
  async getDataById(dataId: string): Promise<SharedDataModel | null> {
    const { db } = await connectToDatabase();
    const collection = db.collection<SharedDataModel>(this.collectionName);
    
    return collection.findOne({ dataId });
  }
  
  /**
   * Get all shared data metadata
   * @param limit Maximum number of records to return
   * @param skip Number of records to skip
   * @returns Array of shared data
   */
  async getAllData(limit: number = 100, skip: number = 0): Promise<SharedDataModel[]> {
    const { db } = await connectToDatabase();
    const collection = db.collection<SharedDataModel>(this.collectionName);
    
    return collection.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }
  
  /**
   * Delete shared data metadata
   * @param dataId The data ID to delete
   * @returns Whether the deletion was successful
   */
  async deleteData(dataId: string): Promise<boolean> {
    const { db } = await connectToDatabase();
    const collection = db.collection<SharedDataModel>(this.collectionName);
    
    const result = await collection.deleteOne({ dataId });
    return result.deletedCount > 0;
  }
} 