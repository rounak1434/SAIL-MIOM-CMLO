import { prisma } from '../db/prisma.js';
import { normalizePhoneNumber } from '../utils/phone.js';
import { getNextTicketId } from '../utils/ticket.js';
import { AppError } from '../middleware/errorHandler.js';
import { realtimeService } from './realtime.service.js';

export interface ComplaintNoteDTO {
  id: string;
  content: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;
}

export interface ComplaintNotesDTO {
  adminToModerator: ComplaintNoteDTO[];
  moderatorToAdmin: ComplaintNoteDTO[];
  adminToUser: ComplaintNoteDTO[];
}

export interface ComplaintDTO {
  id: string;
  ticketId: string;
  name: string;
  email: string;
  phone: string;
  employeeId: string;
  department: string;
  designation: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  imageUrl?: string | null;
  uid?: string | null;
  userEmail?: string | null;
  status: string;
  assignedTo?: string | null;
  assignedToUID?: string | null;
  assignedToName?: string | null;
  notes: ComplaintNotesDTO;
  lastCommentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplaintStatsDTO {
  total: number;
  pending: number;
  assigned: number;
  active: number;
  resolved: number;
  rejected: number;
}

function formatComplaint(complaint: any): ComplaintDTO {
  const notes: ComplaintNotesDTO = {
    adminToModerator: [],
    moderatorToAdmin: [],
    adminToUser: [],
  };

  if (Array.isArray(complaint.notes)) {
    for (const note of complaint.notes) {
      const formattedNote: ComplaintNoteDTO = {
        id: note.id,
        content: note.content,
        authorEmail: note.authorEmail,
        authorName: note.authorName,
        createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
      };

      if (note.noteType === 'adminToModerator') {
        notes.adminToModerator.push(formattedNote);
      } else if (note.noteType === 'moderatorToAdmin') {
        notes.moderatorToAdmin.push(formattedNote);
      } else if (note.noteType === 'adminToUser') {
        notes.adminToUser.push(formattedNote);
      }
    }
  }

  return {
    id: complaint.id,
    ticketId: complaint.ticketId,
    name: complaint.name,
    email: complaint.email,
    phone: complaint.phone,
    employeeId: complaint.employeeId,
    department: complaint.department,
    designation: complaint.designation,
    category: complaint.category,
    title: complaint.title,
    description: complaint.description,
    priority: complaint.priority,
    imageUrl: complaint.imageUrl,
    uid: complaint.uid,
    userEmail: complaint.userEmail,
    status: complaint.status,
    assignedTo: complaint.assignedTo,
    assignedToUID: complaint.assignedToUID,
    assignedToName: complaint.assignedToName,
    notes,
    lastCommentAt: complaint.lastCommentAt,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
  };
}

export class ComplaintService {
  public static async checkSubmissionRateLimit(
    emailInput: string,
    phoneInput: string
  ): Promise<{ limited: boolean; remainingHours?: number }> {
    const email = emailInput.trim().toLowerCase();
    const phone = normalizePhoneNumber(phoneInput);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentComplaint = await prisma.complaint.findFirst({
      where: {
        OR: [{ email }, { phone }],
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (recentComplaint) {
      const elapsedMs = Date.now() - new Date(recentComplaint.createdAt).getTime();
      const remainingHours = Math.max(0.1, 24 - elapsedMs / (1000 * 60 * 60));
      return {
        limited: true,
        remainingHours: parseFloat(remainingHours.toFixed(1)),
      };
    }

    return { limited: false };
  }

  public static async createComplaint(data: {
    name: string;
    email: string;
    phone: string;
    employeeId: string;
    department: string;
    designation: string;
    category: string;
    title: string;
    description: string;
    priority?: string;
    imageUrl?: string;
    uid?: string;
    userEmail?: string;
  }): Promise<{ success: boolean; id: string; ticketId: string }> {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPhone = normalizePhoneNumber(data.phone);

    // 24-hour rate limit check
    const rateLimit = await this.checkSubmissionRateLimit(cleanEmail, cleanPhone);
    if (rateLimit.limited) {
      const err: any = new AppError('rate-limited', 429);
      err.remainingHours = rateLimit.remainingHours;
      throw err;
    }

    const ticketId = await getNextTicketId();

    const complaint = await prisma.complaint.create({
      data: {
        id: ticketId,
        ticketId,
        name: data.name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        employeeId: data.employeeId.trim(),
        department: data.department.trim(),
        designation: data.designation.trim(),
        category: data.category,
        title: data.title.trim(),
        description: data.description.trim(),
        priority: data.priority || 'medium',
        imageUrl: data.imageUrl || null,
        uid: data.uid || null,
        userEmail: data.userEmail?.trim().toLowerCase() || cleanEmail,
        status: 'pending',
      },
      include: {
        notes: true,
      },
    });

    // Broadcast real-time updates
    this.broadcastUpdates();

    return {
      success: true,
      id: complaint.id,
      ticketId: complaint.ticketId,
    };
  }

  public static async getAllComplaints(): Promise<ComplaintDTO[]> {
    const complaints = await prisma.complaint.findMany({
      include: {
        notes: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return complaints.map(formatComplaint);
  }

  public static async getModeratorComplaints(moderatorUID: string): Promise<ComplaintDTO[]> {
    const complaints = await prisma.complaint.findMany({
      where: { assignedToUID: moderatorUID },
      include: {
        notes: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return complaints.map(formatComplaint);
  }

  public static async getComplaintByIdOrTicketId(searchId: string): Promise<ComplaintDTO | null> {
    const clean = searchId.trim().toUpperCase();

    const complaint = await prisma.complaint.findFirst({
      where: {
        OR: [{ id: clean }, { ticketId: clean }],
      },
      include: {
        notes: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!complaint) return null;
    return formatComplaint(complaint);
  }

  public static async updateComplaintStatus(id: string, status: string): Promise<void> {
    const existing = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Complaint not found', 404);
    }

    await prisma.complaint.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    this.broadcastUpdates();
  }

  public static async assignComplaint(
    id: string,
    moderatorEmail: string,
    moderatorUID: string,
    moderatorName: string
  ): Promise<void> {
    const existing = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Complaint not found', 404);
    }

    await prisma.complaint.update({
      where: { id },
      data: {
        assignedTo: moderatorEmail,
        assignedToUID: moderatorUID,
        assignedToName: moderatorName,
        status: 'assigned',
        updatedAt: new Date(),
      },
    });

    // Create notification for assigned moderator
    await prisma.notification.create({
      data: {
        userEmail: moderatorEmail,
        message: `Complaint ${existing.ticketId} assigned to you`,
        type: 'assignment',
        read: false,
      },
    });

    this.broadcastUpdates();
  }

  public static async addNote(
    id: string,
    noteType: 'adminToModerator' | 'moderatorToAdmin' | 'adminToUser',
    content: string,
    authorEmail: string,
    authorName: string,
    authorUID?: string
  ): Promise<void> {
    const existing = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Complaint not found', 404);
    }

    // Anti-spam check if authorUID is known
    if (authorUID) {
      const user = await prisma.user.findUnique({ where: { uid: authorUID } });
      if (user) {
        if (user.blocked) {
          throw new AppError('Account has been blocked from commenting.', 403);
        }

        const now = new Date();
        const lastReset = user.lastReset ? new Date(user.lastReset) : user.createdAt;
        const secondsSinceReset = (now.getTime() - lastReset.getTime()) / 1000;

        let commentCount = user.commentCount;
        let newReset = user.lastReset;

        if (secondsSinceReset >= 60) {
          commentCount = 1;
          newReset = now;
        } else {
          if (commentCount >= 5) {
            throw new AppError('Rate limit exceeded. Please wait a minute before commenting again.', 429);
          }
          commentCount += 1;
        }

        await prisma.user.update({
          where: { uid: authorUID },
          data: {
            commentCount,
            lastReset: newReset,
          },
        });
      }
    }

    await prisma.complaintNote.create({
      data: {
        complaintId: id,
        noteType,
        content: content.trim(),
        authorEmail,
        authorName,
      },
    });

    await prisma.complaint.update({
      where: { id },
      data: {
        lastCommentAt: new Date(),
        updatedAt: new Date(),
      },
    });

    this.broadcastUpdates();
  }

  public static async deleteComplaint(id: string): Promise<void> {
    const existing = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Complaint not found', 404);
    }

    await prisma.complaint.delete({
      where: { id },
    });

    this.broadcastUpdates();
  }

  public static async getStats(): Promise<ComplaintStatsDTO> {
    const complaints = await prisma.complaint.findMany({
      select: { status: true },
    });

    return {
      total: complaints.length,
      pending: complaints.filter((c) => c.status === 'pending').length,
      assigned: complaints.filter((c) => c.status === 'assigned').length,
      active: complaints.filter((c) => c.status === 'active').length,
      resolved: complaints.filter((c) => c.status === 'resolved').length,
      rejected: complaints.filter((c) => c.status === 'rejected').length,
    };
  }

  public static broadcastUpdates(): void {
    realtimeService.broadcastComplaints(async (modUid) => {
      if (modUid) {
        return await ComplaintService.getModeratorComplaints(modUid);
      }
      return await ComplaintService.getAllComplaints();
    });

    realtimeService.broadcastStats(async () => {
      return await ComplaintService.getStats();
    });
  }
}
