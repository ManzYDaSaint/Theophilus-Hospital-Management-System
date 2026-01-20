import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../utils/audit.utils';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export const createPrescription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { visitId, patientId, prescribedBy, medications } = req.body;
        // Default payment details for auto-fulfillment can be 'Cash' or passed in req.body.paymentMethod
        const paymentMethod = req.body.paymentMethod || 'Cash';

        let finalVisitId = visitId;
        // patientId is required if no visitId (to create a visit)


        const result = await prisma.$transaction(async (tx) => {
            // 1. Ensure Visit Exists
            if (!finalVisitId) {
                if (!patientId) {
                    throw new Error('Either visitId or patientId is required');
                }
                if (!req.user) {
                    throw new Error('User not authenticated');
                }

                const visit = await tx.visit.create({
                    data: {
                        patientId,
                        doctorId: req.user.userId,
                        chiefComplaint: 'Direct Prescription',
                        visitDate: new Date(),
                        status: 'Completed',
                    },
                });
                finalVisitId = visit.id;
            } else {
                // Check if visit exists and get patientId if needed for transaction
            }

            // Get Patient ID for transaction if we only have finalVisitId
            // Optimization: if we created visit, we know patientId. If not, we might need to query it.
            // But we can store transaction.patientId if we fetch the visit. 
            // Let's fetch the visit to be safe and get patientId
            const visitData = await tx.visit.findUnique({ where: { id: finalVisitId }, select: { patientId: true } });
            if (!visitData) throw new Error('Invalid Visit ID');
            const transactionPatientId = visitData.patientId;

            const createdPrescriptions = [];

            for (const med of medications) {
                // 2. Stock Validation & Deduction
                const stockItem = await tx.pharmacyStock.findFirst({
                    where: { medicationName: med.medication }
                });

                if (!stockItem) {
                    throw new Error(`Medication not found: ${med.medication}`);
                }

                if (stockItem.currentStock < med.quantity) {
                    throw new Error(`Insufficient stock for ${med.medication}. Available: ${stockItem.currentStock}, Required: ${med.quantity}`);
                }

                // Deduct Stock
                await tx.pharmacyStock.update({
                    where: { id: stockItem.id },
                    data: { currentStock: stockItem.currentStock - med.quantity }
                });

                // Calculate Finances
                const totalAmount = Number(stockItem.sellingPrice) * med.quantity;

                // 3. Create Financial Transaction
                const transaction = await tx.transaction.create({
                    data: {
                        type: 'SALE',
                        category: 'PHARMACY',
                        amount: totalAmount,
                        description: `Prescription fulfillment: ${med.medication} (Qty: ${med.quantity})`,
                        referenceType: 'Prescription',
                        paymentMethod,
                        createdBy: req.user?.userId || '', // Should ideally be there
                        patientId: transactionPatientId,
                    }
                });

                // 4. Create Prescription (Completed & Paid)
                const prescription = await tx.prescription.create({
                    data: {
                        visitId: finalVisitId,
                        prescribedBy,
                        medication: med.medication,
                        quantity: med.quantity,
                        dosage: med.dosage,
                        frequency: med.frequency,
                        duration: med.duration,
                        instructions: med.instructions,
                        status: 'Completed', // Auto-completed
                        paymentStatus: 'Paid', // Auto-paid
                        totalAmount: totalAmount,
                        paidAt: new Date(),
                        transactionId: transaction.id
                    },
                    include: {
                        visit: {
                            include: {
                                patient: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                        },
                        doctor: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                });

                // Update transaction referenceId now that we have prescription ID
                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: { referenceId: prescription.id }
                });

                createdPrescriptions.push(prescription);
            }
            return createdPrescriptions;
        });

        if (req.user) {
            await createAuditLog({
                userId: req.user.userId,
                action: 'CREATE_PRESCRIPTION_AUTO_FULFILLED',
                entity: 'Prescription',
                entityId: result[0]?.id || 'BATCH',
                details: {
                    count: result.length,
                    visitId: finalVisitId,
                    totalValue: result.reduce((sum, p) => sum + Number(p.totalAmount), 0)
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        }

        logger.info('Prescriptions created and fulfilled', { count: result.length, visitId: finalVisitId });

        res.status(201).json({ message: 'Prescriptions created and fulfilled successfully', prescriptions: result });
    } catch (error: any) {
        logger.error('Create prescription error', { error });
        res.status(500).json({ error: error.message || 'Failed to create prescriptions' });
    }
};

export const getAllPrescriptions = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, page = '1', limit = '20', status } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const where: any = {};

        if (status && status !== 'All') {
            where.status = status as string;
        }

        if (search) {
            where.OR = [
                { medication: { contains: search as string } },
                { visit: { patient: { firstName: { contains: search as string } } } },
                { visit: { patient: { lastName: { contains: search as string } } } },
            ];
        }

        const [prescriptions, total] = await Promise.all([
            prisma.prescription.findMany({
                where,
                skip,
                take: parseInt(limit as string),
                include: {
                    visit: {
                        include: {
                            patient: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    phoneNumber: true
                                }
                            }
                        }
                    },
                    doctor: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.prescription.count({ where }),
        ]);

        res.json({
            prescriptions,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                totalPages: Math.ceil(total / parseInt(limit as string)),
            },
        });

    } catch (error) {
        logger.error('Get all descriptions error', { error });
        res.status(500).json({ error: 'Failed to fetch prescriptions' });
    }
};

export const getPrescriptionStats = async (_req: Request, res: Response): Promise<void> => {
    try {
        const [
            total,
            active,
            completed,
            cancelled,
            statusDistribution,
            topMedications
        ] = await Promise.all([
            prisma.prescription.count(),
            prisma.prescription.count({ where: { status: 'Active' } }),
            prisma.prescription.count({ where: { status: 'Completed' } }),
            prisma.prescription.count({ where: { status: 'Cancelled' } }),
            prisma.prescription.groupBy({
                by: ['status'],
                _count: { status: true }
            }),
            prisma.prescription.groupBy({
                by: ['medication'],
                _count: { medication: true },
                orderBy: {
                    _count: { medication: 'desc' }
                },
                take: 5
            })
        ]);

        res.json({
            counts: {
                total,
                active,
                completed,
                cancelled
            },
            charts: {
                status: statusDistribution.map(s => ({ name: s.status, value: s._count.status })),
                topMedications: topMedications.map(m => ({ name: m.medication, value: m._count.medication }))
            }
        });

    } catch (error) {
        logger.error('Get prescription stats error', { error });
        res.status(500).json({ error: 'Failed to fetch prescription stats' });
    }
};

export const getPrescriptionsByVisit = async (req: Request, res: Response): Promise<void> => {
    try {
        const { visitId } = req.params;

        const prescriptions = await prisma.prescription.findMany({
            where: { visitId },
            include: {
                doctor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(prescriptions);
    } catch (error) {
        logger.error('Get prescriptions error', { error });
        res.status(500).json({ error: 'Failed to fetch prescriptions' });
    }
};

export const updatePrescription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const prescription = await prisma.prescription.update({
            where: { id },
            data: updateData,
        });

        if (req.user) {
            await createAuditLog({
                userId: req.user.userId,
                action: 'UPDATE_PRESCRIPTION',
                entity: 'Prescription',
                entityId: prescription.id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        }

        logger.info('Prescription updated', { prescriptionId: prescription.id });

        res.json(prescription);
    } catch (error) {
        logger.error('Update prescription error', { error });
        res.status(500).json({ error: 'Failed to update prescription' });
    }
};

// Fulfill prescription - deduct stock and record payment
export const fulfillPrescription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { paymentMethod = 'Cash' } = req.body;

        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Get prescription with visit and patient details
        const prescription = await prisma.prescription.findUnique({
            where: { id },
            include: {
                visit: {
                    include: {
                        patient: true,
                    },
                },
            },
        });

        if (!prescription) {
            res.status(404).json({ error: 'Prescription not found' });
            return;
        }

        if (prescription.paymentStatus === 'Paid') {
            res.status(400).json({ error: 'Prescription already fulfilled' });
            return;
        }

        if (prescription.status === 'Cancelled') {
            res.status(400).json({ error: 'Cannot fulfill cancelled prescription' });
            return;
        }

        // Get medication from pharmacy stock
        const medication = await prisma.pharmacyStock.findFirst({
            where: { medicationName: prescription.medication },
        });

        if (!medication) {
            res.status(404).json({ error: 'Medication not found in pharmacy stock' });
            return;
        }

        // Check stock availability
        if (medication.currentStock < prescription.quantity) {
            res.status(400).json({
                error: 'Insufficient stock',
                available: medication.currentStock,
                required: prescription.quantity,
            });
            return;
        }

        // Calculate total amount
        const totalAmount = Number(medication.sellingPrice) * prescription.quantity;
        const costAmount = Number(medication.costPrice) * prescription.quantity;

        // Use Prisma transaction for atomicity
        const result = await prisma.$transaction(async (tx) => {
            // 1. Deduct from pharmacy stock
            const updatedStock = await tx.pharmacyStock.update({
                where: { id: medication.id },
                data: {
                    currentStock: medication.currentStock - prescription.quantity,
                },
            });

            // 2. Create financial transaction
            const transaction = await tx.transaction.create({
                data: {
                    type: 'SALE',
                    category: 'PHARMACY',
                    amount: totalAmount,
                    description: `Prescription fulfillment: ${prescription.medication} (Qty: ${prescription.quantity})`,
                    referenceId: prescription.id,
                    referenceType: 'Prescription',
                    paymentMethod,
                    createdBy: req.user!.userId,
                    patientId: prescription.visit.patientId,
                },
            });

            // 3. Update prescription status
            const updatedPrescription = await tx.prescription.update({
                where: { id },
                data: {
                    totalAmount,
                    paymentStatus: 'Paid',
                    paidAt: new Date(),
                    transactionId: transaction.id,
                    status: 'Completed',
                },
                include: {
                    visit: {
                        include: {
                            patient: true,
                        },
                    },
                },
            });

            return { updatedStock, transaction, updatedPrescription };
        });

        // Create audit log
        await createAuditLog({
            userId: req.user.userId,
            action: 'FULFILL_PRESCRIPTION',
            entity: 'Prescription',
            entityId: prescription.id,
            details: {
                medication: prescription.medication,
                quantity: prescription.quantity,
                totalAmount,
                costAmount,
                profit: totalAmount - costAmount,
                stockRemaining: result.updatedStock.currentStock,
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        logger.info('Prescription fulfilled', {
            prescriptionId: prescription.id,
            totalAmount,
            stockRemaining: result.updatedStock.currentStock,
        });

        res.json({
            message: 'Prescription fulfilled successfully',
            prescription: result.updatedPrescription,
            transaction: result.transaction,
            stockRemaining: result.updatedStock.currentStock,
            receipt: {
                prescriptionId: prescription.id,
                patient: `${prescription.visit.patient.firstName} ${prescription.visit.patient.lastName}`,
                medication: prescription.medication,
                quantity: prescription.quantity,
                unitPrice: medication.sellingPrice,
                totalAmount,
                paymentMethod,
                date: new Date(),
            },
        });
    } catch (error) {
        logger.error('Fulfill prescription error', { error });
        res.status(500).json({ error: 'Failed to fulfill prescription' });
    }
};
