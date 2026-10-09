import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserService } from '../services/user.service.js';
import { validateBody } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';

export const userRouter = Router();

userRouter.use(requireAdmin);

const blockSchema = z.object({
  blocked: z.boolean(),
});

// Get all blocked users
userRouter.get(
  '/blocked',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isSuperAdmin = (req.user?.role as string) === 'super_admin';
      const blocked = await UserService.getBlockedUsers(isSuperAdmin);
      res.status(200).json(blocked);
    } catch (error) {
      next(error);
    }
  }
);

// Block or unblock a user
userRouter.patch(
  '/:uid/block',
  validateBody(blockSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await UserService.toggleUserBlock(req.params.uid, req.body.blocked, req.user?.role);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);
