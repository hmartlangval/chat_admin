import { ObjectId } from 'mongodb';
import { DynamicRepository } from '../../repositories/DynamicRepository';
import { AidoOrderProcessing } from './AidoOrderProcessing';

export interface PubSubRecord {
  id: string;
  prop: 0 | 1;
  tax: 0 | 1;
  data: any;
  createdAt?: Date;
  updatedAt?: Date;
  _id?: string;
}

export class PubSub {
  private repository: DynamicRepository;
  private aidoOrderProcessing: AidoOrderProcessing;

  constructor() {
    this.repository = new DynamicRepository('pubsub');
    this.aidoOrderProcessing = new AidoOrderProcessing();
  }

  async create(data: Partial<PubSubRecord>): Promise<PubSubRecord> {
    // Ensure required fields
    if (!data.id) {
      throw new Error('ID is required');
    }

    const pubsubData: any = {
      // id: data.id,
      prop: data.prop === 1 ? 1 : 0,
      tax: data.tax === 1 ? 1 : 0,
      data: data.data || {},
      // Set _id to match id to keep them in sync
      _id: data.id
    };

    const created = await this.repository.create(pubsubData);
    return created[0] as PubSubRecord;
  }

  async getActiveProp(): Promise<PubSubRecord[]> {
    // Get active property records in FIFO order
    const records = await this.repository.find({ prop: 1 });
    return records.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ) as PubSubRecord[];
  }

  async getActiveTax(): Promise<PubSubRecord[]> {
    // Get active tax records in FIFO order
    const records = await this.repository.find({ tax: 1 });
    return records.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ) as PubSubRecord[];
  }

  async findById(id: string): Promise<PubSubRecord | null> {
    const records = await this.repository.find({ _id: new ObjectId(id) });
    return records && records.length > 0 ? records[0] as PubSubRecord : null;
  }

  async markPropComplete(id: string): Promise<PubSubRecord | null> {
    // Find the record first
    const record = await this.findById(id);
    if (!record || !record._id) {
      return null;
    }

    // Update pubsub record
    const updated = await this.repository.update(
      record._id.toString(), 
      { prop: 0 }
    );

    // Also update Aido order processing
    const aidoRecords = await this.aidoOrderProcessing.find({ id });
    if (aidoRecords && aidoRecords.length > 0) {
      await this.aidoOrderProcessing.update(
        aidoRecords[0]._id.toString(), 
        { property_status: 'completed' }
      );
    }

    // Check if both are complete to remove from queue
    if (updated && updated.prop === 0 && updated.tax === 0) {
      await this.repository.delete(record._id.toString());
    }

    return updated as PubSubRecord | null;
  }

  async markTaxComplete(id: string): Promise<PubSubRecord | null> {
    // Find the record first
    const record = await this.findById(id);
    if (!record || !record._id) {
      return null;
    }

    // Update pubsub record
    const updated = await this.repository.update(
      record._id.toString(), 
      { tax: 0 }
    );

    // Also update Aido order processing
    const aidoRecords = await this.aidoOrderProcessing.find({ id });
    if (aidoRecords && aidoRecords.length > 0) {
      await this.aidoOrderProcessing.update(
        aidoRecords[0]._id.toString(), 
        { tax_status: 'completed' }
      );
    }

    // Check if both are complete to remove from queue
    if (updated && updated.prop === 0 && updated.tax === 0) {
      await this.repository.delete(record._id.toString());
    }

    return updated as PubSubRecord | null;
  }

  async getAll(): Promise<PubSubRecord[]> {
    return this.repository.find() as Promise<PubSubRecord[]>;
  }
} 