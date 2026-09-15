import { Router, Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

// Get notifications for current user
notificationRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notifications = await NotificationService.getNotificationsForUser(
        req.user!.email
      );
      res.status(200).json(notifications);
    } catch (error) {
      next(error);
    }
  }
);

// Mark single notification as read
notificationRouter.patch(
  '/:id/read',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await NotificationService.markAsRead(req.params.id, req.user!.email);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// Mark all notifications as read
notificationRouter.patch(
  '/read-all',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await NotificationService.markAllAsRead(req.user!.email);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);
