import { Request, Response, NextFunction } from 'express';

export const requireRole = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!allowedRoles.includes(req.user.roleName)) {
            res.status(403).json({
                error: 'Access denied',
                message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
            });
            return;
        }

        next();
    };
};
