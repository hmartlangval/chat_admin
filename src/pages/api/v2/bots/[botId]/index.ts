import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { botId } = req.query;

  try {
    // Server-side request to the local API using explicit IPv4 address
    const response = await axios.get(`http://127.0.0.1:5000/api/bots/${botId}`);
    return res.status(200).json(response.data);
  } catch (error) {
    console.error(`Error fetching bot ${botId}:`, error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch bot information'
    });
  }
} 