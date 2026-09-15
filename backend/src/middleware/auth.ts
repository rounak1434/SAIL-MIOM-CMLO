import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { AppError } from './errorHandler.js';

export interface AuthUser {
  uid: string;
  email: string;
  role: 'admin' | 'moderator' | 'user';
  name: string;
  displayName: string;
  businessName?: string | null;
  phone?: string | null;
  blocked: boolean;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface JwtPayload {
  uid: string;
  email: string;
  role: 'admin' | 'moderator' | 'user';
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export async function extractAndVerifyUser(req: Request): Promise<AuthUser | null> {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { uid: decoded.uid },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      uid: user.uid,
      email: user.email,
      role: user.role as 'admin' | 'moderator' | 'user',
      name: user.name,
      displayName: user.displayName,
      businessName: user.businessName,
      phone: user.phone,
      blocked: user.blocked,
      isActive: user.isActive,
    };
  } catch {
    return null;
  }
}

export async function authenticateOptional(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const user = await extractAndVerifyUser(req);
  if (user) {
    req.user = user;
  }
  next();
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const user = await extractAndVerifyUser(req);
  if (!user) {
    next(new AppError('User not authenticated.', 401));
    return;
  }
  req.user = user;
  next();
}

export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const user = await extractAndVerifyUser(req);
  if (!user) {
    next(new AppError('User not authenticated.', 401));
    return;
  }
  if (user.role !== 'admin') {
    next(new AppError('Access denied. Admin credentials required.', 403));
    return;
  }
  req.user = user;
  next();
}

export async function requireModeratorOrAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const user = await extractAndVerifyUser(req);
  if (!user) {
    next(new AppError('User not authenticated.', 401));
    return;
  }
  if (user.role !== 'admin' && user.role !== 'moderator') {
    next(new AppError('Access denied. Moderator or Admin credentials required.', 403));
    return;
  }
  req.user = user;
  next();
}
