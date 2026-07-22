import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { errorHandler } from './middleware/error';

// Import Routers
import authRouter from './routes/auth.routes';
import employeeRouter from './routes/employee.routes';
import attendanceRouter from './routes/attendance.routes';
import payrollRouter from './routes/payroll.routes';
import inventoryRouter from './routes/inventory.routes';
import salesRouter from './routes/sales.routes';
import crmRouter from './routes/crm.routes';
import financeRouter from './routes/finance.routes';
import uploadRouter from './routes/upload.routes';
import aiRouter from './routes/ai.routes';

const app = express();

// Security Middlewares
app.use(helmet());
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://naziran-matrix-gpt-web.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin as string) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));


// Compression & Body Parsers
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rate Limiting (5000 requests per 15 min in dev, 100 in production)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 5000,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api', limiter);

// Bind REST Endpoints
app.use('/api/auth', authRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/sales', salesRouter);
app.use('/api/crm', crmRouter);
app.use('/api/finance', financeRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/ai', aiRouter);

// Base Route check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'healthy', message: 'Naziran ERP Matrix API is operational' });
});

// Global Error Handler
app.use(errorHandler);

export default app;
