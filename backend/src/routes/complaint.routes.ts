import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ComplaintService } from '../services/complaint.service.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  requireAuth,
  requireAdmin,
  requireModeratorOrAdmin,
  authenticateOptional,
} from '../middleware/auth.js';
import { realtimeService } from '../services/realtime.service.js';

export const complaintRouter = Router();

const createComplaintSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  department: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation is required'),
  category: z.enum([
    'Electrical Complaint',
    'Power Supply / Wiring',
    'Lighting / Fan / Appliance',
    'Others',
  ]),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  imageUrl: z.string().optional(),
  uid: z.string().optional(),
  userEmail: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(['pending', 'assigned', 'active', 'resolved', 'rejected']),
});

const assignSchema = z.object({
  moderatorEmail: z.string().email(),
  moderatorUID: z.string().min(1),
  moderatorName: z.string().min(1),
});

const noteSchema = z.object({
  noteType: z.enum(['adminToModerator', 'moderatorToAdmin', 'adminToUser']),
  content: z.string().min(1, 'Note content cannot be empty'),
  authorEmail: z.string().email(),
  authorName: z.string().min(1),
});

const rateLimitQuerySchema = z.object({
  email: z.string().email(),
  phone: z.string().min(1),
});

// SSE Streams
complaintRouter.get(
  '/stream',
  authenticateOptional,
  (req: Request, res: Response) => {
    const moderatorUID = req.user?.role === 'moderator' ? req.user.uid : undefined;
    realtimeService.subscribeComplaints(res, moderatorUID, async () => {
      if (moderatorUID) {
        return await ComplaintService.getModeratorComplaints(moderatorUID);
      }
      return await ComplaintService.getAllComplaints();
    });
  }
);

complaintRouter.get(
  '/stats/stream',
  (_req: Request, res: Response) => {
    realtimeService.subscribeStats(res, async () => {
      return await ComplaintService.getStats();
    });
  }
);

// Rate limit check
complaintRouter.get(
  '/rate-limit-check',
  validateQuery(rateLimitQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = req.query.email as string;
      const phone = req.query.phone as string;
      const result = await ComplaintService.checkSubmissionRateLimit(email, phone);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get stats (admin only)
complaintRouter.get(
  '/stats',
  requireAdmin,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await ComplaintService.getStats();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }
);

// Get moderator's assigned complaints
complaintRouter.get(
  '/moderator/:moderatorUID',
  requireModeratorOrAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { moderatorUID } = req.params;
      const complaints = await ComplaintService.getModeratorComplaints(moderatorUID);
      res.status(200).json(complaints);
    } catch (error) {
      next(error);
    }
  }
);

// Get all complaints (admin only)
complaintRouter.get(
  '/',
  requireAdmin,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const complaints = await ComplaintService.getAllComplaints();
      res.status(200).json(complaints);
    } catch (error) {
      next(error);
    }
  }
);

// Create complaint (public)
complaintRouter.post(
  '/',
  validateBody(createComplaintSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ComplaintService.createComplaint(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message === 'rate-limited') {
        res.status(429).json({
          success: false,
          error: 'rate-limited',
          remainingHours: error.remainingHours || 24,
        });
        return;
      }
      next(error);
    }
  }
);

// Get single complaint by ID or ticketId (public - used by Track Complaint)
complaintRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const complaint = await ComplaintService.getComplaintByIdOrTicketId(req.params.id);
      if (!complaint) {
        res.status(200).json(null);
        return;
      }
      res.status(200).json(complaint);
    } catch (error) {
      next(error);
    }
  }
);

// Update status
complaintRouter.patch(
  '/:id/status',
  requireModeratorOrAdmin,
  validateBody(statusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ComplaintService.updateComplaintStatus(req.params.id, req.body.status);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// Assign complaint (admin only)
complaintRouter.post(
  '/:id/assign',
  requireAdmin,
  validateBody(assignSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ComplaintService.assignComplaint(
        req.params.id,
        req.body.moderatorEmail,
        req.body.moderatorUID,
        req.body.moderatorName
      );
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// Add note
complaintRouter.post(
  '/:id/notes',
  requireModeratorOrAdmin,
  validateBody(noteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ComplaintService.addNote(
        req.params.id,
        req.body.noteType,
        req.body.content,
        req.body.authorEmail,
        req.body.authorName,
        req.user?.uid
      );
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// Delete complaint (admin only)
complaintRouter.delete(
  '/:id',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ComplaintService.deleteComplaint(req.params.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);
