import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ModeratorService } from '../services/moderator.service.js';
import { validateBody } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';

export const moderatorRouter = Router();

const createModeratorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  businessName: z.string().min(1, 'Business / department name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  password: z.string().min(6, 'Password should be at least 6 characters'),
});

const statusSchema = z.object({
  isActive: z.boolean(),
});

moderatorRouter.use(requireAdmin);

// Create moderator account
moderatorRouter.post(
  '/',
  validateBody(createModeratorSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ModeratorService.createModerator(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get all moderators
moderatorRouter.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const moderators = await ModeratorService.getAllModerators();
      res.status(200).json(moderators);
    } catch (error) {
      next(error);
    }
  }
);

// Toggle moderator active status (or soft delete)
moderatorRouter.patch(
  '/:id/status',
  validateBody(statusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ModeratorService.toggleModeratorStatus(req.params.id, req.body.isActive);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);
