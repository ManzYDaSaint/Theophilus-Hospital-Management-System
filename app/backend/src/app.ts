import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import logger from './utils/logger';

// Import routes
import authRoutes from './routes/auth.routes';
import patientsRoutes from './routes/patients.routes';
import visitsRoutes from './routes/visits.routes';
import prescriptionsRoutes from './routes/prescriptions.routes';
import pharmacyRoutes from './routes/pharmacy.routes';
import financeRoutes from './routes/finance.routes';
import expensesRoutes from './routes/expenses.routes';
import analyticsRoutes from './routes/analytics.routes';
import usersRoutes from './routes/users.routes';
import systemRoutes from './routes/system.routes';

// Import middlewares
import { errorHandler } from './middlewares/error.middleware';

const app: Express = express();

// CORS configuration for LAN access
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });
    next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/system', systemRoutes);

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../../frontend/dist');
    app.use(express.static(frontendPath));

    // Fallback to index.html for React Router
    app.get('*', (_req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
