import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import usersRouter from './routes/users';
import familiesRouter from './routes/families';
import groupsRouter from './routes/groups';
import importRouter from './routes/import';

// Import middleware
import { ApiResponse } from './types/database';

dotenv.config();

const app: Express = express();
const port = process.env['PORT'] || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const response: ApiResponse<{ status: string; timestamp: string }> = {
    success: true,
    data: {
      status: 'OK',
      timestamp: new Date().toISOString()
    }
  };
  res.json(response);
});

// API routes
app.use('/api/users', usersRouter);
app.use('/api/families', familiesRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/import', importRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  const response: ApiResponse<{ message: string; version: string }> = {
    success: true,
    data: {
      message: 'Church Management System API',
      version: '1.0.0'
    }
  };
  res.json(response);
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  const response: ApiResponse<null> = {
    success: false,
    error: 'Route not found'
  };
  res.status(404).json(response);
});

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error);
  
  const response: ApiResponse<null> = {
    success: false,
    error: 'Internal server error',
    ...(process.env['NODE_ENV'] === 'development' && { message: error.message })
  };
  
  res.status(500).json(response);
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Church Management System API running on port ${port}`);
  console.log(`📝 Environment: ${process.env['NODE_ENV'] || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${port}/health`);
});

export default app;
