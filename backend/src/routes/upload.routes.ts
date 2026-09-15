import { Router, Request, Response, NextFunction } from 'express';
import { upload } from '../middleware/upload.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

export const uploadRouter = Router();

uploadRouter.post(
  '/image',
  upload.single('image'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('No image file provided', 400);
      }

      const baseUrl = env.BASE_URL || 'http://localhost:8000';
      const fileUrl = `${baseUrl.replace(/\/$/, '')}/uploads/${req.file.filename}`;

      res.status(200).json({
        success: true,
        url: fileUrl,
      });
    } catch (error) {
      next(error);
    }
  }
);
