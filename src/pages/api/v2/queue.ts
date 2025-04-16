import type { NextApiRequest, NextApiResponse } from 'next';
import { DynamicRepository } from '@lib/repositories/DynamicRepository';
import { QueueRepository } from '@/data/models/QueueRepository';

// type ExtendedNextApiResponse = NextApiResponse & {
//     socket: {
//       server: NetServer & {
//         io?: SocketIOServer;
//         clients?: Map<string, ISocketClients>
//       };
//     };
//   };

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        // Extract filter parameters from query
        const status = req.query.status as string;
        const queue = req.query.queue as string;
        const orderNumber = req.query.orderNumber as string;

        const filters: any = {};
        if (status) filters.status = status;
        if (queue) filters.queue = queue;
        if (orderNumber) filters['order_info.extracted_data.order_number'] = orderNumber;

        const repo = new QueueRepository();
        // const allqueues = await repo.getAllData(limit, skip, filters);
        const allqueues = await repo.getAllData(limit, skip);

        // Get total count for pagination with filters
        const total = await repo.getAllData(undefined, undefined);
        const totalPages = Math.ceil(total.length / limit);

        return res.status(200).json({
            records: allqueues,
            pagination: {
                currentPage: page,
                totalPages,
                totalRecords: total.length,
                limit
            }
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message || 'An error occurred while fetching queues'
        });
    }
}