import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';
import { normalizePhoneNumber } from '../utils/phone.js';
import { AppError } from '../middleware/errorHandler.js';

export class AdminService {
  public static async deleteUser(uid: string, callerRole?: string): Promise<{ success: boolean; message: string }> {
    const existing = await prisma.user.findUnique({
      where: { uid },
    });

    if (!existing) {
      throw new AppError('User not found', 404);
    }

    if (existing.role === 'super_admin' && callerRole !== 'super_admin') {
      throw new AppError('Unauthorized: Cannot delete Super Admin accounts', 403);
    }

    // Set assigned complaints to unassigned before deleting
    await prisma.complaint.updateMany({
      where: { assignedToUID: uid },
      data: {
        assignedTo: null,
        assignedToUID: null,
        assignedToName: null,
        status: 'pending',
      },
    });

    await prisma.user.delete({
      where: { uid },
    });

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  public static async updateUserPassword(
    uid: string,
    newPassword: string,
    callerRole?: string
  ): Promise<{ success: boolean; message: string }> {
    if (newPassword.trim().length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    const existing = await prisma.user.findUnique({
      where: { uid },
    });

    if (!existing) {
      throw new AppError('User not found', 404);
    }

    if (existing.role === 'super_admin' && callerRole !== 'super_admin') {
      throw new AppError('Unauthorized: Cannot modify Super Admin account', 403);
    }

    const passwordHash = await bcrypt.hash(newPassword.trim(), 10);

    await prisma.user.update({
      where: { uid },
      data: { passwordHash },
    });

    return {
      success: true,
      message: 'Password updated successfully',
    };
  }

  public static async updateUserData(
    uid: string,
    updates: {
      name?: string;
      displayName?: string;
      businessName?: string;
      email?: string;
      phone?: string;
      role?: 'chief_admin' | 'admin' | 'moderator' | 'user';
    },
    callerRole?: string
  ): Promise<{ success: boolean; message: string }> {
    const existing = await prisma.user.findUnique({
      where: { uid },
    });

    if (!existing) {
      throw new AppError('User not found', 404);
    }

    if (existing.role === 'super_admin' && callerRole !== 'super_admin') {
      throw new AppError('Unauthorized: Cannot modify Super Admin account', 403);
    }

    const dataToUpdate: any = {};
    if (updates.name !== undefined) dataToUpdate.name = updates.name.trim();
    if (updates.displayName !== undefined) dataToUpdate.displayName = updates.displayName.trim();
    if (updates.businessName !== undefined) dataToUpdate.businessName = updates.businessName.trim();
    if (updates.email !== undefined) dataToUpdate.email = updates.email.trim().toLowerCase();
    if (updates.phone !== undefined) dataToUpdate.phone = normalizePhoneNumber(updates.phone);
    if (updates.role !== undefined) dataToUpdate.role = updates.role;

    await prisma.user.update({
      where: { uid },
      data: dataToUpdate,
    });

    return {
      success: true,
      message: 'User updated successfully',
    };
  }

  public static async createPrivilegedUser(data: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'chief_admin' | 'moderator';
    businessName?: string;
    phone?: string;
  }): Promise<{ uid: string; email: string; name: string; role: string }> {
    const email = data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('Email already in use', 409);
    }

    if (data.password.trim().length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    const passwordHash = await bcrypt.hash(data.password.trim(), 10);
    const displayName = data.name.trim();

    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: data.role,
        name: displayName,
        displayName,
        businessName: data.businessName?.trim() || (data.role === 'moderator' ? 'Electrical Department' : null),
        phone: data.phone ? normalizePhoneNumber(data.phone) : null,
        blocked: false,
        isActive: true,
        commentCount: 0,
      },
    });

    return {
      uid: created.uid,
      email: created.email,
      name: created.name,
      role: created.role,
    };
  }
}
