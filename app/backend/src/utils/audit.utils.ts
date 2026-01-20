import { PrismaClient } from '@prisma/client';
import logger from './logger';

const prisma = new PrismaClient();

interface AuditLogData {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

export const createAuditLog = async (data: AuditLogData): Promise<void> => {
    try {
        await prisma.auditLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                entity: data.entity,
                entityId: data.entityId,
                details: data.details ? JSON.stringify(data.details) : null,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
            },
        });
    } catch (error) {
        logger.error('Failed to create audit log', { error, data });
    }
};

export default { createAuditLog };
