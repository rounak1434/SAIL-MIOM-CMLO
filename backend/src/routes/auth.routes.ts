import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password should be at least 6 characters'),
  displayName: z.string().optional(),
});

const resetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

authRouter.post(
  '/login',
  validateBody(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await AuthService.login(req.body.email, req.body.password);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post(
  '/signup',
  validateBody(signupSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await AuthService.signup(
        req.body.email,
        req.body.password,
        req.body.displayName
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post(
  '/logout',
  (_req: Request, res: Response) => {
    res.status(200).json({ success: true });
  }
);

authRouter.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await AuthService.getMe(req.user!.uid);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post(
  '/password-reset',
  validateBody(resetSchema),
  (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Password reset request noted.',
    });
  }
);
