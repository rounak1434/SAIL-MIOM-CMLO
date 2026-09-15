import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { ModeratorDTO } from './moderator.service.js';

export class UserService {
  public static async toggleUserBlock(uid: string, blocked: boolean): Promise<void> {
    const existing = await prisma.user.findUnique({
      where: { uid },
    });

    if (!existing) {
      throw new AppError('User not found', 404);
    }

    await prisma.user.update({
      where: { uid },
      data: {
        blocked,
        commentCount: 0,
      },
    });
  }

  public static async getBlockedUsers(): Promise<ModeratorDTO[]> {
    const blocked = await prisma.user.findMany({
      where: { blocked: true },
      orderBy: { createdAt: 'desc' },
    });

    return blocked.map((u) => ({
      id: u.uid,
      name: u.name,
      businessName: u.businessName || '',
      email: u.email,
      phone: u.phone || '',
      role: u.role as 'moderator',
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));
  }
}
