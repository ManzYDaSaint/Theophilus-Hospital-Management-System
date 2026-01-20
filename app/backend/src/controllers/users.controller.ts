import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Get all users
export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(users);
    } catch (error) {
        logger.error('Get all users error', { error });
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Create new user
export const createUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, firstName, lastName, phoneNumber, roleId } = req.body;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            res.status(409).json({ error: 'User with this email already exists' });
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                phoneNumber,
                roleId,
                isActive: true,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: {
                    select: { name: true },
                },
            },
        });

        logger.info('User created', { userId: newUser.id, createdBy: req.user?.userId });

        res.status(201).json(newUser);
    } catch (error) {
        logger.error('Create user error', { error });
        res.status(500).json({ error: 'Failed to create user' });
    }
};

// Update user
export const updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { email, firstName, lastName, phoneNumber, roleId, isActive } = req.body;

        const user = await prisma.user.update({
            where: { id },
            data: {
                email,
                firstName,
                lastName,
                phoneNumber,
                roleId,
                isActive,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        logger.info('User updated', { userId: id, updatedBy: req.user?.userId });

        res.json(user);
    } catch (error) {
        logger.error('Update user error', { error });
        res.status(500).json({ error: 'Failed to update user' });
    }
};

// Delete user (Soft delete usually, but user might want hard delete. Plan said soft/hard. I'll do Hard delete for cleanup if requested, but safest is typically soft. However, standard 'delete' usually implies removal. Given schema has 'isActive', soft delete via update is better, but this endpoint is DELETE. I will implement delete as delete, but maybe check for dependencies. 
// Actually, strict FKs might prevent deletion if they have transactions. Safest is Soft Delete toggle in update, but for DELETE method specifically...
// Let's implement Soft Delete behavior on DELETE endpoint for safety if they have related data, OR actual delete if fresh. 
// NOTE: Plan said "Soft delete (set isActive: false) or hard delete".
// I'll implement a check: if they have related records, fail or soft delete.
// For simplicity and standard admin expectations, DELETE usually means remove. But `isActive` exists.
// Let's make DELETE endpoint actually toggle isActive to false (Deactivate).
// But wait, the Update endpoint handles isActive. 
// I will implement DELETE as a hard delete attempt, if it fails due to FK, I will return error saying "Deactivate instead".
// OR better: The "DeleteUser" function in controller will just delete.
// Let's stick to standard DELETE = prisma.delete. If it fails, they should deactivate.
// Wait, the prompt says "add, edit and delete users".
// I will try to delete.

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Prevent deleting self
        if (req.user?.userId === id) {
            res.status(400).json({ error: 'Cannot delete your own account' });
            return;
        }

        await prisma.user.delete({
            where: { id },
        });

        logger.info('User deleted', { userId: id, deletedBy: req.user?.userId });

        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        // Check for foreign key constraint violation (code P2003 usually)
        if (error.code === 'P2003') {
            res.status(400).json({ error: 'Cannot delete user with associated records. Deactivate them instead.' });
            return;
        }
        logger.error('Delete user error', { error });
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

// Get all roles
export const getRoles = async (_req: Request, res: Response): Promise<void> => {
    try {
        const roles = await prisma.role.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(roles);
    } catch (error) {
        logger.error('Get roles error', { error });
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
};
