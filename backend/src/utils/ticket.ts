import { prisma } from '../db/prisma.js';

/**
 * Generates the next sequential ticket ID in the format MIOM-NNNN (e.g. MIOM-0001)
 * Uses atomic transaction on the TicketCounter table.
 */
export async function getNextTicketId(): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    let counter = await tx.ticketCounter.findUnique({
      where: { id: 1 },
    });

    if (!counter) {
      // Find highest existing complaint number or start at 0
      const existingComplaints = await tx.complaint.findMany({
        select: { ticketId: true },
      });

      let maxNumber = 0;
      for (const c of existingComplaints) {
        const match = c.ticketId.match(/MIOM-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      }

      counter = await tx.ticketCounter.create({
        data: {
          id: 1,
          currentNumber: maxNumber + 1,
        },
      });
    } else {
      counter = await tx.ticketCounter.update({
        where: { id: 1 },
        data: {
          currentNumber: {
            increment: 1,
          },
        },
      });
    }

    return `MIOM-${String(counter.currentNumber).padStart(4, '0')}`;
  });
}
