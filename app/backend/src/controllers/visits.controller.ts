import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../utils/audit.utils';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export const getAllVisits = async (req: Request, res: Response): Promise<void> => {
    try {
        const { patientId, status, page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const where: any = {};
        if (patientId) where.patientId = patientId;
        if (status) where.status = status;

        const [visits, total] = await Promise.all([
            prisma.visit.findMany({
                where,
                skip,
                take: parseInt(limit as string),
                include: {
                    patient: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phoneNumber: true,
                        },
                    },
                    doctor: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    diagnoses: true,
                    prescriptions: true,
                },
                orderBy: { visitDate: 'desc' },
            }),
            prisma.visit.count({ where }),
        ]);

        res.json({
            visits,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                totalPages: Math.ceil(total / parseInt(limit as string)),
            },
        });
    } catch (error) {
        logger.error('Get visits error', { error });
        res.status(500).json({ error: 'Failed to fetch visits' });
    }
};

export const getVisitById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const visit = await prisma.visit.findUnique({
            where: { id },
            include: {
                patient: true,
                doctor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                diagnoses: true,
                prescriptions: true,
            },
        });

        if (!visit) {
            res.status(404).json({ error: 'Visit not found' });
            return;
        }

        res.json(visit);
    } catch (error) {
        logger.error('Get visit error', { error });
        res.status(500).json({ error: 'Failed to fetch visit' });
    }
};

export const createVisit = async (req: Request, res: Response): Promise<void> => {
    try {
        const visitData = req.body;

        const visit = await prisma.visit.create({
            data: visitData,
            include: {
                patient: true,
                doctor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        if (req.user) {
            await createAuditLog({
                userId: req.user.userId,
                action: 'CREATE_VISIT',
                entity: 'Visit',
                entityId: visit.id,
                details: { patientId: visit.patientId },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        }

        logger.info('Visit created', { visitId: visit.id });

        res.status(201).json(visit);
    } catch (error) {
        logger.error('Create visit error', { error });
        res.status(500).json({ error: 'Failed to create visit' });
    }
};

export const updateVisit = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const visitData = req.body;

        const visit = await prisma.visit.update({
            where: { id },
            data: visitData,
            include: {
                patient: true,
                doctor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                diagnoses: true,
                prescriptions: true,
            },
        });

        if (req.user) {
            await createAuditLog({
                userId: req.user.userId,
                action: 'UPDATE_VISIT',
                entity: 'Visit',
                entityId: visit.id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        }

        logger.info('Visit updated', { visitId: visit.id });

        res.json(visit);
    } catch (error) {
        logger.error('Update visit error', { error });
        res.status(500).json({ error: 'Failed to update visit' });
    }
};

export const addDiagnosis = async (req: Request, res: Response): Promise<void> => {
    try {
        const { visitId } = req.params;
        const diagnosisData = req.body;

        const diagnosis = await prisma.diagnosis.create({
            data: {
                ...diagnosisData,
                visitId,
            },
        });

        if (req.user) {
            await createAuditLog({
                userId: req.user.userId,
                action: 'ADD_DIAGNOSIS',
                entity: 'Diagnosis',
                entityId: diagnosis.id,
                details: { visitId },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        }

        logger.info('Diagnosis added', { diagnosisId: diagnosis.id, visitId });

        res.status(201).json(diagnosis);
    } catch (error) {
        logger.error('Add diagnosis error', { error });
        res.status(500).json({ error: 'Failed to add diagnosis' });
    }
};
