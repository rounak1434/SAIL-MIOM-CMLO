import type { Complaint } from '../services/complaint.service';

// xlsx and jspdf are heavy, so they load only when someone actually exports a complaint.
export const downloadComplaintExcel = async (complaint: Complaint) => {
  const { downloadComplaintExcel: download } = await import('./complaintExport');
  download(complaint);
};

export const downloadComplaintPDF = async (complaint: Complaint) => {
  const { downloadComplaintPDF: download } = await import('./complaintExport');
  await download(complaint);
};
