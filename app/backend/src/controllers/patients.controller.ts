import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../utils/audit.utils';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export const getAllPatients = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const where: any = { isActive: true };

        if (search) {
            where.OR = [
                { firstName: { contains: search as string } },
                { lastName: { contains: search as string } },
                { phoneNumber: { contains: search as string } }
            ];
        }

        const [patients, total] = await Promise.all([
            prisma.patient.findMany({
                where,
                skip,
                take: parseInt(limit as string),
                orderBy: { createdAt: 'desc' },
            }),
            prisma.patient.count({ where }),
        ]);

        res.json({
            patients,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                totalPages: Math.ceil(total / parseInt(limit as string)),
            },
        });
    } catch (error) {
        logger.error('Get patients error', { error });
        res.status(500).json({ error: 'Failed to fetch patients' });
    }
};

export const getPatientById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const patient = await prisma.patient.findUnique({
            where: { id },
            include: {
                visits: {
                    include: {
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
                    take: 10,
                },
            },
        });

        if (!patient) {
            res.status(404).json({ error: 'Patient not found' });
            return;
        }

        res.json(patient);
    } catch (error) {
        logger.error('Get patient error', { error });
        res.status(500).json({ error: 'Failed to fetch patient' });
    }
};

export const createPatient = async (req: Request, res: Response): Promise<void> => {
    try {
        const patientData = req.body;

        // Check if patient with same phone number already exists
        if (patientData.phoneNumber) {
            const existingPatient = await prisma.patient.findFirst({
                where: {
                    phoneNumber: patientData.phoneNumber,
                    isActive: true
                }
            });

            if (existingPatient) {
                res.status(409).json({
                    error: 'Patient already exists',
                    message: `A patient with phone number ${patientData.phoneNumber} already exists in the system.`,
                    existingPatient: {
                        id: existingPatient.id,
                        firstName: existingPatient.firstName,
                        lastName: existingPatient.lastName,
                        phoneNumber: existingPatient.phoneNumber
                    }
                });
                return;
            }
        }

        // Ensure dateOfBirth is a Date object
        if (patientData.dateOfBirth) {
            patientData.dateOfBirth = new Date(patientData.dateOfBirth);
        }

        const patient = await prisma.patient.create({
            data: patientData,
        });

        // Audit log
        if (req.user) {
            await createAuditLog({
                userId: req.user.userId,
                action: 'CREATE_PATIENT',
                entity: 'Patient',
                entityId: patient.id,
                details: { patientName: `${patient.firstName} ${patient.lastName}` },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        }

        logger.info('Patient created', { patientId: patient.id });

        res.status(201).json(patient);
    } catch (error) {
        logger.error('Create patient error', { error });
        res.status(500).json({ error: 'Failed to create patient' });
    }
};

export const updatePatient = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const patientData = req.body;

        if (patientData.dateOfBirth) {
            patientData.dateOfBirth = new Date(patientData.dateOfBirth);
        }

        const patient = await prisma.patient.update({
            where: { id },
            data: patientData,
        });

        // Audit log
        if (req.user) {
            await createAuditLog({
                userId: req.user.userId,
                action: 'UPDATE_PATIENT',
                entity: 'Patient',
                entityId: patient.id,
                details: { updates: Object.keys(patientData) },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        }

        logger.info('Patient updated', { patientId: patient.id });

        res.json(patient);
    } catch (error) {
        logger.error('Update patient error', { error });
        res.status(500).json({ error: 'Failed to update patient' });
    }
};

export const deletePatient = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Soft delete
        const patient = await prisma.patient.update({
            where: { id },
            data: { isActive: false },
        });

        // Audit log
        if (req.user) {
            await createAuditLog({
                userId: req.user.userId,
                action: 'DELETE_PATIENT',
                entity: 'Patient',
                entityId: patient.id,
                details: { patientName: `${patient.firstName} ${patient.lastName}` },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        }

        logger.info('Patient deleted', { patientId: patient.id });

        res.json({ message: 'Patient deleted successfully' });
    } catch (error) {
        logger.error('Delete patient error', { error });
        res.status(500).json({ error: 'Failed to delete patient' });
    }
};

export const getPatientStats = async (_req: Request, res: Response): Promise<void> => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const fiveYearsAgo = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate());

        const [
            totalPatients,
            newThisMonth,
            lessThanFive,
            moreThanFive,
            genderDistribution,
            dailyAttendance
        ] = await Promise.all([
            // Total active patients
            prisma.patient.count({ where: { isActive: true } }),

            // New patients this month
            prisma.patient.count({
                where: {
                    isActive: true,
                    createdAt: { gte: startOfMonth }
                }
            }),

            // Patients < 5 years old
            prisma.patient.count({
                where: {
                    isActive: true,
                    dateOfBirth: { gt: fiveYearsAgo }
                }
            }),

            // Patients > 5 years old
            prisma.patient.count({
                where: {
                    isActive: true,
                    dateOfBirth: { lte: fiveYearsAgo }
                }
            }),

            // Gender distribution
            prisma.patient.groupBy({
                by: ['gender'],
                _count: { gender: true },
                where: { isActive: true }
            }),

            // Daily attendance (Visits in the last 7 days)
            prisma.visit.groupBy({
                by: ['visitDate'],
                _count: { id: true },
                where: {
                    visitDate: {
                        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
                    }
                },
                orderBy: { visitDate: 'asc' }
            })
        ]);

        // Format gender distribution
        const genderStats = genderDistribution.map(g => ({
            name: g.gender,
            value: g._count.gender
        }));

        // Format daily attendance
        // We need to fill in missing days with 0
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            last7Days.push(d.toISOString().split('T')[0]);
        }

        const attendanceStats = last7Days.map(date => {
            const found = dailyAttendance.find(d =>
                d.visitDate.toISOString().split('T')[0] === date
            );
            return {
                name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                visits: found ? found._count.id : 0
            };
        });

        res.json({
            counts: {
                total: totalPatients,
                newThisMonth,
                lessThanFive,
                moreThanFive
            },
            charts: {
                gender: genderStats,
                attendance: attendanceStats
            }
        });
    } catch (error) {
        logger.error('Get patient stats error', { error });
        res.status(500).json({ error: 'Failed to fetch patient stats' });
    }
};
