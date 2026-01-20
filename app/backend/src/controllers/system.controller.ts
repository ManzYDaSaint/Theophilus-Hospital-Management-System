import { Request, Response } from 'express';
import { getLocalIpAddress } from '../utils/network.util';

export const getServerInfo = async (_req: Request, res: Response): Promise<void> => {
    try {
        const ipAddress = getLocalIpAddress();
        const port = process.env.PORT || 3000;

        res.status(200).json({
            ipAddress,
            port,
            url: `http://${ipAddress}:${port}`
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve server info' });
    }
};
