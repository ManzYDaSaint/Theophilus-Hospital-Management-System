import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.utils';
import { createAuditLog } from '../utils/audit.utils';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Find user with role
        const user = await prisma.user.findUnique({
            where: { email },
            include: { role: true },
        });

        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        if (!user.isActive) {
            res.status(403).json({ error: 'Account is deactivated' });
            return;
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Generate tokens
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            roleId: user.roleId,
            roleName: user.role.name,
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });

        // Audit log
        await createAuditLog({
            userId: user.id,
            action: 'LOGIN',
            entity: 'User',
            entityId: user.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        logger.info('User logged in', { userId: user.id, email: user.email });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role.name,
            },
            accessToken,
            refreshToken,
        });
    } catch (error) {
        logger.error('Login error', { error });
        res.status(500).json({ error: 'Login failed' });
    }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        if (req.user) {
            await createAuditLog({
                userId: req.user.userId,
                action: 'LOGOUT',
                entity: 'User',
                entityId: req.user.userId,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        }

        res.json({ message: 'Logout successful' });
    } catch (error) {
        logger.error('Logout error', { error });
        res.status(500).json({ error: 'Logout failed' });
    }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
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
                        description: true,
                    },
                },
            },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json(user);
    } catch (error) {
        logger.error('Get profile error', { error });
        res.status(500).json({ error: 'Failed to get profile' });
    }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { currentPassword, newPassword } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Current password is incorrect' });
            return;
        }

        // Hash and update new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        // Audit log
        await createAuditLog({
            userId: user.id,
            action: 'CHANGE_PASSWORD',
            entity: 'User',
            entityId: user.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        logger.info('Password changed', { userId: user.id });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        logger.error('Change password error', { error });
        res.status(500).json({ error: 'Failed to change password' });
    }
};
