import { Collection, ObjectId, Document, WithId, OptionalUnlessRequiredId } from 'mongodb';
import { connectToDatabase } from '../../database/mongodb';

type BaseDocument = {
  createdAt?: Date;
  updatedAt?: Date;
  isActive?: boolean;
};

export class DynamicRepository<T extends Document = any> {
  private collection: Collection<T>;
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    this.collection = null as any; // Will be initialized in init()
  }

  private async init() {
    if (!this.collection) {
      const { db } = await connectToDatabase();
      this.collection = db.collection<T>(this.collectionName);
    }
    return this.collection;
  }

  async create(data: Omit<T, keyof BaseDocument | '_id'> | Omit<T, keyof BaseDocument | '_id'>[]): Promise<WithId<T>[]> {
    const collection = await this.init();
    const records = Array.isArray(data) ? data : [data];
    const now = new Date();
    
    const documents = records.map(record => ({
      ...record,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      _id: new ObjectId()
    } as unknown as OptionalUnlessRequiredId<T>));

    await collection.insertMany(documents);
    return collection.find({ _id: { $in: documents.map(d => d._id) } }).toArray();
  }

  async update(id: string, data: Partial<Omit<T, keyof BaseDocument | '_id'>>): Promise<WithId<T> | null> {
    const collection = await this.init();
    const now = new Date();
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) } as any,
      { 
        $set: { 
          ...data,
          updatedAt: now
        } as any
      },
      { returnDocument: 'after', includeResultMetadata: true }
    );
    return result?.value || null;
  }

  async delete(id: string): Promise<boolean> {
    const collection = await this.init();
    const result = await collection.deleteOne({ _id: new ObjectId(id) } as any);
    return result.deletedCount > 0;
  }

  async find(filter: any = {}): Promise<WithId<T>[]> {
    const collection = await this.init();
    return collection.find(filter).toArray();
  }
  async findOne(filter: any = {}, options: any = {}): Promise<WithId<T> | null> {
    const collection = await this.init();
    return collection.findOne(filter, options);
  }
} 