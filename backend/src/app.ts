import express, { Express } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { uploadDir } from './middleware/upload.js';
import { errorHandler } from './middleware/errorHandler.js';

import { authRouter } from './routes/auth.routes.js';
import { complaintRouter } from './routes/complaint.routes.js';
import { moderatorRouter } from './routes/moderator.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { userRouter } from './routes/user.routes.js';
import { uploadRouter } from './routes/upload.routes.js';
import { notificationRouter } from './routes/notification.routes.js';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static uploads directory
  app.use('/uploads', express.static(uploadDir));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount API Routers strictly following the specification
  app.use('/api/auth', authRouter);
  app.use('/api/complaints', complaintRouter);
  app.use('/api/moderators', moderatorRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/users', userRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/notifications', notificationRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: true, message: 'Route not found' });
  });

  // Central error handler
  app.use(errorHandler);

  return app;
}
