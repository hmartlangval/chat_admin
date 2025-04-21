import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    exec('c:\\aido\\supercommand\\restart.bat', (error, stdout, stderr) => {
      if (error) {
        console.error('Execution error:', error);
        // Still return success since we want this to be forced
      }
      if (stderr) {
        console.error('stderr:', stderr);
        // Still return success since we want this to be forced
      }
      if (stdout) {
        console.log('stdout:', stdout);
      }
    });

    // Return success immediately, don't wait for completion
    return res.status(200).json({
      success: true,
      message: 'Reboot command initiated'
    });

  } catch (error) {
    // Even if there's an error, return success since this should be forced
    console.error('Error occurred but continuing anyway:', error);
    return res.status(200).json({
      success: true,
      message: 'Reboot command attempted'
    });
  }
}
