import { NextApiRequest, NextApiResponse } from 'next';
import { DynamicRepository } from '@lib/repositories/DynamicRepository';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const collection = "tasks";
  const queue = req.query.queue;

  const repo = new DynamicRepository(collection);
  // const assignee = req.headers['x-task-type'];
  // const assignee = req.query.assignee;
  try {
    switch (req.method) {
      case 'GET':
        const filter = req.query.filter ? JSON.parse(req.query.filter as string) : {};
        /** we are returning both queued and in_progress tasks.
         * Because sometimes regardless of UI maintaining its own busy state, this endpoint can still be called.
         * In situations where there is a task ongoin, we tell them there is an existing task.
         * End user needs to validate the status and proceed accordingly.
         */
        filter.status = { $in: ["queued", "in_progress"] };
        filter.queue = queue;
        filter.isActive = true;
        const sort = { createdAt: 1 }; // Sort by createdAt in descending order
        const options = {
          sort,
          limit: 1,
          projection: { 
            id: { $toString: "$_id" }, 
            _id: 0, 
            refId: 1,
            createdAt: 1, 
            status: 1, 
            queue: 1, 
            isActive: 1 
          }
        };


        // console.log('fetching next task from queue', queue);
        // console.log('filter', filter);
        // filter.limit = 1;
        const record = await repo.findOne(filter, options);
        return res.status(200).json({ record });

      default:
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Dynamic API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
