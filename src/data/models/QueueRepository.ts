import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../db';
import { Queue } from '@/types/queue';

type PipelineStage = {
  $match?: Record<string, any>;
  $addFields?: Record<string, any>;
  $lookup?: Record<string, any>;
  $unwind?: Record<string, any>;
  $sort?: Record<string, any>;
  $skip?: number;
  $limit?: number;
};

export class QueueRepository {
  private collection1 = 'tasks';
  private collection2 = 'aido_order_processing';
  
  async getAllData(limit: number = 100, skip: number = 0, filter: Record<string, any> = {}): Promise<Queue[]> {
    const { db } = await connectToDatabase();
    
    const pipeline: PipelineStage[] = [
      {
        $match: filter
      },
      {
        $addFields: {
          refIdObj: { $toObjectId: "$refId" }
        }
      },
      {
        $lookup: {
          from: this.collection2,
          localField: "refIdObj",
          foreignField: "_id",
          pipeline: [
            {
              $match: filter.orderNumber ? {
                "extracted_data.order_number": filter.orderNumber
              } : {}
            },
            {
              $project: {
                "extracted_data.order_number": 1
              }
            }
          ],
          as: "order_info"
        }
      },
      {
        $unwind: {
          path: "$order_info",
          preserveNullAndEmptyArrays: true
        }
      }
    ];

    // Remove orderNumber from filter since it's handled in lookup
    if (filter.orderNumber) {
      delete filter.orderNumber;
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    );

    return db.collection(this.collection1).aggregate(pipeline).toArray() as unknown as Queue[];
  }

}