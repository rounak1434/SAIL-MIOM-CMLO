import { fetchComplaintNotes } from '../services/complaint.service';
import type { Complaint } from '../services/complaint.service';
import type { ComplaintListRow } from './complaintListExport';

// Dashboard lists carry empty notes, so read them when someone exports.
const withNotes = async (complaint: Complaint): Promise<Complaint> => {
  const id = complaint.id || complaint.ticketId;
  if (!id) return complaint;

  try {
    return { ...complaint, notes: await fetchComplaintNotes(id) };
  } catch (err) {
    console.warn(`Could not load notes for complaint ${id}:`, err);
    return complaint;
  }
};

// xlsx and jspdf are heavy, so they load only when someone actually exports a complaint.
export const downloadComplaintExcel = async (complaint: Complaint) => {
  const { downloadComplaintExcel: download } = await import('./complaintExport');
  download(await withNotes(complaint));
};

export const downloadComplaintPDF = async (complaint: Complaint) => {
  const { downloadComplaintPDF: download } = await import('./complaintExport');
  await download(await withNotes(complaint));
};

export const downloadComplaintListExcel = async (
  rows: ComplaintListRow[],
  appliedFilters: [label: string, value: string][],
  filename: string
) => {
  const { downloadComplaintListExcel: download } = await import('./complaintListExport');
  download(rows, appliedFilters, filename);
};
