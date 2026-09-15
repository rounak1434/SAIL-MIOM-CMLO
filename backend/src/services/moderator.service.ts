import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';
import { normalizePhoneNumber } from '../utils/phone.js';
import { AppError } from '../middleware/errorHandler.js';

export interface ModeratorDTO {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  role: 'moderator';
  isActive: boolean;
  createdAt: Date;
}

export class ModeratorService {
  public static async createModerator(data: {
    name: string;
    businessName: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<{ uid: string }> {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPhone = normalizePhoneNumber(data.phone);

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      throw new AppError('Email already in use', 409);
    }

    const passwordHash = await bcrypt.hash(data.password.trim(), 10);

    const newMod = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        role: 'moderator',
        name: data.name.trim(),
        displayName: data.name.trim(),
        businessName: data.businessName.trim(),
        phone: cleanPhone,
        blocked: false,
        isActive: true,
        commentCount: 0,
      },
    });

    return { uid: newMod.uid };
  }

  public static async getAllModerators(): Promise<ModeratorDTO[]> {
    const mods = await prisma.user.findMany({
      where: { role: 'moderator' },
      orderBy: { createdAt: 'desc' },
    });

    return mods.map((m) => ({
      id: m.uid,
      name: m.name,
      businessName: m.businessName || '',
      email: m.email,
      phone: m.phone || '',
      role: 'moderator',
      isActive: m.isActive,
      createdAt: m.createdAt,
    }));
  }

  public static async toggleModeratorStatus(id: string, isActive: boolean): Promise<void> {
    const existing = await prisma.user.findUnique({
      where: { uid: id },
    });

    if (!existing || existing.role !== 'moderator') {
      throw new AppError('Moderator not found', 404);
    }

    await prisma.user.update({
      where: { uid: id },
      data: { isActive },
    });
  }

  public static async deleteModerator(id: string): Promise<void> {
    await this.toggleModeratorStatus(id, false);
  }
}
