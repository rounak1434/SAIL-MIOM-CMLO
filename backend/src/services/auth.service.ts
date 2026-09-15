import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateToken } from '../middleware/auth.js';

export interface LoginResult {
  token: string;
  user: {
    uid: string;
    email: string;
    displayName: string | null;
  };
  role: {
    email: string;
    role: string;
    displayName: string | null;
    name: string;
    createdAt: Date;
  };
}

export interface SignupResult {
  token: string;
  user: {
    uid: string;
    email: string;
    displayName: string | null;
  };
  role: 'user';
  message: string;
}

export class AuthService {
  public static async login(emailInput: string, passwordInput: string): Promise<LoginResult> {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 400);
    }

    if (!user.isActive) {
      throw new AppError('Account deactivated', 403);
    }

    if (user.blocked) {
      throw new AppError('Account has been blocked. Please contact an administrator.', 403);
    }

    const token = generateToken({
      uid: user.uid,
      email: user.email,
      role: user.role as 'admin' | 'moderator' | 'user',
    });

    return {
      token,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.name || null,
      },
      role: {
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        name: user.name,
        createdAt: user.createdAt,
      },
    };
  }

  public static async signup(
    emailInput: string,
    passwordInput: string,
    displayNameInput?: string
  ): Promise<SignupResult> {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    if (password.length < 6) {
      throw new AppError('Password should be at least 6 characters', 400);
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new AppError('Email already in use', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const displayName = displayNameInput?.trim() || email.split('@')[0];

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'user',
        name: displayName,
        displayName,
        blocked: false,
        isActive: true,
        commentCount: 0,
      },
    });

    const token = generateToken({
      uid: newUser.uid,
      email: newUser.email,
      role: 'user',
    });

    return {
      token,
      user: {
        uid: newUser.uid,
        email: newUser.email,
        displayName: newUser.displayName,
      },
      role: 'user',
      message: 'Account created successfully with user role',
    };
  }

  public static async getMe(uid: string) {
    const user = await prisma.user.findUnique({
      where: { uid },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      name: user.name,
      businessName: user.businessName,
      phone: user.phone,
      blocked: user.blocked,
      isActive: user.isActive,
      commentCount: user.commentCount,
      createdAt: user.createdAt,
    };
  }
}
