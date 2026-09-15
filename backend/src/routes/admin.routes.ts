import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AdminService } from '../services/admin.service.js';
import { validateBody } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  displayName: z.string().optional(),
  businessName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'moderator', 'user']).optional(),
});

// Delete user permanently
adminRouter.delete(
  '/users/:uid',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await AdminService.deleteUser(req.params.uid);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Update user password
adminRouter.patch(
  '/users/:uid/password',
  validateBody(passwordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await AdminService.updateUserPassword(
        req.params.uid,
        req.body.newPassword
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Update user data
adminRouter.patch(
  '/users/:uid',
  validateBody(updateUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await AdminService.updateUserData(
        req.params.uid,
        req.body
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);
