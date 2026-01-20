import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import app from './app';
import logger from './utils/logger';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Ensure logs directory exists
const logsDir = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    try {
        fs.mkdirSync(logsDir, { recursive: true });
    } catch (err) {
        console.error('Failed to create logs directory:', err);
    }
}

// Test database connection
async function connectDatabase() {
    try {
        await prisma.$connect();
        logger.info('✅ Database connected successfully');
    } catch (error) {
        logger.error('❌ Failed to connect to database', {
            error: error instanceof Error ? error.message : error,
            dbUrl: process.env.DATABASE_URL
        });
        process.exit(1);
    }
}

// Start server
async function startServer() {
    try {
        await connectDatabase();

        const server = app.listen(PORT, () => {
            logger.info(`🏥 Hospital Management System - Server running`);
            logger.info(`📍 Local: http://localhost:${PORT}`);
            logger.info(`🌐 Network: http://${HOST}:${PORT}`);
            logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM signal received: closing HTTP server');
            server.close(async () => {
                logger.info('HTTP server closed');
                await prisma.$disconnect();
                process.exit(0);
            });
        });

        process.on('SIGINT', async () => {
            logger.info('SIGINT signal received: closing HTTP server');
            server.close(async () => {
                logger.info('HTTP server closed');
                await prisma.$disconnect();
                process.exit(0);
            });
        });
    } catch (error) {
        logger.error('Failed to start server', { error });
        process.exit(1);
    }
}

startServer();
