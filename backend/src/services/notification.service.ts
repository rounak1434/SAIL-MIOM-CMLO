import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export class NotificationService {
  public static async getNotificationsForUser(userEmail: string) {
    const cleanEmail = userEmail.trim().toLowerCase();

    const notifications = await prisma.notification.findMany({
      where: { userEmail: cleanEmail },
      orderBy: [
        { read: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return notifications;
  }

  public static async markAsRead(id: string, userEmail: string): Promise<void> {
    const cleanEmail = userEmail.trim().toLowerCase();

    const existing = await prisma.notification.findUnique({
      where: { id },
    });

    if (!existing || existing.userEmail.toLowerCase() !== cleanEmail) {
      throw new AppError('Notification not found', 404);
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  public static async markAllAsRead(userEmail: string): Promise<void> {
    const cleanEmail = userEmail.trim().toLowerCase();

    await prisma.notification.updateMany({
      where: {
        userEmail: cleanEmail,
        read: false,
      },
      data: { read: true },
    });
  }
}
