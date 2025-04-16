import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../db';
import { Queue } from '@/types/queue';

export class QueueRepository {
  private collection1 = 'tasks';
  private collection2 = 'aido_order_processing';
  
  async getAllData(limit: number = 100, skip: number = 0): Promise<Queue[]> {
    const { db } = await connectToDatabase();
    
    return db.collection(this.collection1).aggregate([
      {
        $addFields: {
          // Convert string refId to ObjectId
          refIdObj: { $toObjectId: "$refId" }
        }
      },
      {
        $lookup: {
          from: this.collection2,
          localField: "refIdObj", // Use converted ObjectId field
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                "extracted_data.order_number": 1
              }
            }
          ],
          as: "order_info"
        }
      },
      // unwind part is used without which result will be a 1 to many ( array of orderInfo)
      {
        $unwind: {
          path: "$order_info",
          preserveNullAndEmptyArrays: true
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]).toArray() as unknown as Queue[];
  }

} 