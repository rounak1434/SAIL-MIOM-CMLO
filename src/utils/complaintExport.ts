import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Complaint } from '../services/complaint.service';

export interface ParsedExportData {
  ticketId: string;
  plantName: string;
  name: string;
  employmentType: string;
  personalNo: string;
  phone: string;
  department: string;
  locationType: string;
  selectedLocation: string;
  townshipLocation?: string;
  qtrNo?: string;
  specifiedLocation: string;
  complaintLocation: string;
  siteLocation: string;
  natureOfComplaint: string;
  otherComplaintDetails: string;
  description: string;
  status: string;
  priority: string;
  assignedModerator: string;
  createdDate: string;
  updatedDate: string;
  resolutionNotes: string;
  imageUrl?: string;
}

const formatDate = (dateVal: any): string => {
  if (!dateVal) return 'N/A';
  try {
    if (typeof dateVal?.toDate === 'function') {
      return new Date(dateVal.toDate()).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    }
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    }
  } catch (e) {
    // Ignore error
  }
  return String(dateVal);
};

export const parseComplaintExportData = (complaint: Complaint): ParsedExportData => {
  const rawDesc = complaint.description || '';
  let cleanDesc = rawDesc;
  let parsedLocationType = '';
  let parsedPlantLoc = '';
  let parsedTownshipLoc = '';
  let parsedSpecifiedLoc = '';
  let parsedLegacyPlant = '';
  let parsedLegacySite = '';
  let parsedPlantName = 'SAIL MIOM, CMLO';
  let parsedEmpType = complaint.designation || '';
  let parsedQtrNo = '';

  // Parse location details footer if present
  if (rawDesc.includes('[Location & Posting Details]')) {
    const parts = rawDesc.split('[Location & Posting Details]');
    cleanDesc = parts[0].trim();
    const meta = parts[1] || '';

    const locTypeMatch = meta.match(/Location Type:\s*([^|\n]+)/i);
    if (locTypeMatch) parsedLocationType = locTypeMatch[1].trim();

    const plantLocMatch = meta.match(/Plant Location:\s*([^|\n]+)/i);
    if (plantLocMatch) parsedPlantLoc = plantLocMatch[1].trim();

    const townshipLocMatch = meta.match(/Township Location:\s*([^|\n]+)/i);
    if (townshipLocMatch) parsedTownshipLoc = townshipLocMatch[1].trim();

    const qtrNoMatch = meta.match(/Qtr No\.:\s*([^|\n]+)/i);
    if (qtrNoMatch) parsedQtrNo = qtrNoMatch[1].trim();

    const specifiedMatch = meta.match(/Specified Location:\s*([^|\n]+)/i);
    if (specifiedMatch) parsedSpecifiedLoc = specifiedMatch[1].trim();

    const plantMatch = meta.match(/Plant:\s*([^|\n]+)/i);
    if (plantMatch) parsedLegacyPlant = plantMatch[1].trim();

    const siteMatch = meta.match(/Site(?: Location)?:\s*([^|\n]+)/i);
    if (siteMatch) parsedLegacySite = siteMatch[1].trim();

    const plantNameMatch = meta.match(/Plant Name:\s*([^|\n]+)/i);
    if (plantNameMatch) parsedPlantName = plantNameMatch[1].trim();

    const empMatch = meta.match(/Employment Type:\s*([^|\n]+)/i);
    if (empMatch) parsedEmpType = empMatch[1].trim();
  }

  // Determine Location Type and values with full backward compatibility
  const locationType =
    complaint.locationType ||
    parsedLocationType ||
    (complaint.complaintLocation || parsedLegacyPlant ? 'Plant' : (complaint.siteLocation || parsedLegacySite ? 'Township' : ''));

  const selectedLocation =
    complaint.selectedLocation ||
    (locationType === 'Plant'
      ? (complaint.plantLocation || parsedPlantLoc || complaint.complaintLocation || parsedLegacyPlant)
      : (complaint.townshipLocation || parsedTownshipLoc || complaint.siteLocation || parsedLegacySite)) ||
    complaint.plantLocation ||
    complaint.townshipLocation ||
    complaint.complaintLocation ||
    complaint.siteLocation ||
    'N/A';

  const qtrNo = complaint.qtrNo || parsedQtrNo || '';
  const townshipLocation =
    complaint.townshipLocation ||
    (locationType === 'Township' ? selectedLocation : '') ||
    '';

  const specifiedLocation =
    complaint.specifiedLocation ||
    parsedSpecifiedLoc ||
    complaint.plantLocationDetails ||
    '';

  // Format notes
  const notesList: string[] = [];
  if (complaint.notes) {
    if (Array.isArray(complaint.notes.adminToUser) && complaint.notes.adminToUser.length > 0) {
      complaint.notes.adminToUser.forEach((n) => {
        notesList.push(`[Admin To User (${formatDate(n.createdAt)})]: ${n.content}`);
      });
    }
    if (Array.isArray(complaint.notes.moderatorToAdmin) && complaint.notes.moderatorToAdmin.length > 0) {
      complaint.notes.moderatorToAdmin.forEach((n) => {
        notesList.push(`[Moderator Note (${formatDate(n.createdAt)})]: ${n.content}`);
      });
    }
    if (Array.isArray(complaint.notes.adminToModerator) && complaint.notes.adminToModerator.length > 0) {
      complaint.notes.adminToModerator.forEach((n) => {
        notesList.push(`[Admin To Moderator (${formatDate(n.createdAt)})]: ${n.content}`);
      });
    }
  }

  const nature = complaint.title || complaint.category || 'N/A';
  let otherDetails = 'N/A';
  if (nature.startsWith('Other:')) {
    otherDetails = nature.replace(/^Other:\s*/i, '').trim();
  }

  return {
    ticketId: complaint.ticketId || complaint.id || 'N/A',
    plantName: (complaint as any).plantName || parsedPlantName || 'SAIL MIOM, CMLO',
    name: complaint.name || 'N/A',
    employmentType: (complaint as any).employmentType || parsedEmpType || complaint.designation || 'N/A',
    personalNo: (complaint as any).personalNo || complaint.employeeId || '',
    phone: complaint.phone || 'N/A',
    department: complaint.department || 'N/A',
    locationType: locationType || 'N/A',
    selectedLocation: selectedLocation || 'N/A',
    townshipLocation: townshipLocation || (locationType === 'Township' ? selectedLocation : ''),
    qtrNo: qtrNo || undefined,
    specifiedLocation: specifiedLocation,
    complaintLocation: (complaint as any).complaintLocation || parsedLegacyPlant || selectedLocation || 'N/A',
    siteLocation: (complaint as any).siteLocation || parsedLegacySite || selectedLocation || 'N/A',
    natureOfComplaint: nature,
    otherComplaintDetails: (complaint as any).otherComplaintDetails || otherDetails,
    description: cleanDesc || rawDesc || 'N/A',
    status: (complaint.status || 'PENDING').toUpperCase(),
    priority: (complaint.priority || 'MEDIUM').toUpperCase(),
    assignedModerator: complaint.assignedToName || 'Unassigned',
    createdDate: formatDate(complaint.createdAt),
    updatedDate: formatDate(complaint.updatedAt),
    resolutionNotes: notesList.length > 0 ? notesList.join('\n') : 'No notes recorded',
    imageUrl: complaint.imageUrl,
  };
};

/**
 * Downloads a single complaint as an Excel (.xlsx) file
 */
export const downloadComplaintExcel = (complaint: Complaint) => {
  const data = parseComplaintExportData(complaint);

  const row: Record<string, any> = {
    'Complaint ID': data.ticketId,
    'Plant Name': data.plantName,
    'Name of Complaining Person': data.name,
    'Employment Type': data.employmentType,
    'Personal No.': data.personalNo,
    'Mobile No.': data.phone,
    'Department': data.department,
    'Location Type': data.locationType,
    ...(data.locationType === 'Plant'
      ? { 'Plant Location': data.selectedLocation }
      : data.locationType === 'Township'
      ? { 'Township Location': data.selectedLocation }
      : { 'Selected Location': data.selectedLocation }),
  };

  if (data.specifiedLocation) {
    row['Specified Location'] = data.specifiedLocation;
  }

  if ((data.locationType === 'Township' || !data.locationType) && data.qtrNo) {
    row['Qtr No.'] = data.qtrNo;
  }

  row['Nature of Complaint'] = data.natureOfComplaint;
  row['Other Complaint Details'] = data.otherComplaintDetails;
  row['Complaint Description'] = data.description;
  row['Status'] = data.status;
  row['Priority'] = data.priority;
  row['Assigned Moderator'] = data.assignedModerator;
  row['Created Date'] = data.createdDate;
  row['Last Updated Date'] = data.updatedDate;
  row['Resolution / Notes'] = data.resolutionNotes;
  row['Photograph URL'] = data.imageUrl || 'None';

  const worksheet = XLSX.utils.json_to_sheet([row]);

  // Set generous column widths for readability
  const colWidths = Object.keys(row).map((key) => {
    const val = String((row as any)[key] || '');
    return {
      wch: Math.max(key.length + 3, Math.min(val.length + 2, 45)),
    };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Complaint Record');

  const filename = `${data.ticketId}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

/**
 * Safely converts an image URL into a base64 JPEG data string
 */
const loadImageAsBase64 = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    const timeout = setTimeout(() => {
      resolve(null);
    }, 4000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } else {
          resolve(null);
        }
      } catch (err) {
        console.warn('Canvas toDataURL failed:', err);
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };

    img.src = url;
  });
};

/**
 * Downloads a single complaint as a formatted PDF file
 */
export const downloadComplaintPDF = async (complaint: Complaint) => {
  const data = parseComplaintExportData(complaint);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage();
      y = 15;
    }
  };

  // 1. Header Banner
  doc.setFillColor(30, 64, 175); // Blue primary
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('STEEL AUTHORITY OF INDIA LIMITED (SAIL)', margin + 4, y + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Meghahatuburu Iron Ore Mine (MIOM, CMLO) — Electrical Maintenance Department',
    margin + 4,
    y + 13
  );
  doc.text('Official Complaint & Maintenance Work Order Record', margin + 4, y + 18);

  y += 28;

  // 2. Ticket ID & Status Highlight Box
  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(209, 213, 219);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Complaint ID:', margin + 4, y + 9);

  doc.setTextColor(37, 99, 235);
  doc.setFontSize(12);
  doc.setFont('courier', 'bold');
  doc.text(data.ticketId, margin + 35, y + 9);

  doc.setTextColor(55, 65, 81);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Status: ${data.status}`, margin + contentWidth - 48, y + 9);

  y += 18;

  // Helper for drawing clean section titles
  const drawSectionTitle = (title: string) => {
    checkPageBreak(12);
    doc.setFillColor(239, 246, 255);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin + 3, y + 5);
    y += 9;
  };

  // Helper for drawing 2-column key/value rows
  const drawFieldRow = (label: string, value: string) => {
    checkPageBreak(7);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99);
    doc.text(label, margin + 2, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    const splitVal = doc.splitTextToSize(value || 'N/A', contentWidth - 62);
    doc.text(splitVal, margin + 58, y + 4);

    const rowHeight = Math.max(6, splitVal.length * 4.5 + 2);
    y += rowHeight;
  };

  // Section: Complainant Information
  drawSectionTitle('1. Complainant Information');
  drawFieldRow('Name:', data.name);
  drawFieldRow('Employment Type:', data.employmentType);
  drawFieldRow('Personal No.:', data.personalNo || '—');
  drawFieldRow('Mobile No.:', data.phone);
  drawFieldRow('Department:', data.department);
  y += 2;

  // Section: Complaint Information
  drawSectionTitle('2. Complaint & Location Details');
  drawFieldRow('Plant Name:', data.plantName);
  if (data.locationType && data.locationType !== 'N/A') {
    drawFieldRow('Location Type:', data.locationType);
    if (data.locationType === 'Plant') {
      drawFieldRow('Plant Location:', data.selectedLocation);
      if (data.specifiedLocation) {
        drawFieldRow('Specified Location:', data.specifiedLocation);
      }
    } else if (data.locationType === 'Township') {
      drawFieldRow('Township Location:', data.selectedLocation);
      if (data.specifiedLocation) {
        drawFieldRow('Specified Location:', data.specifiedLocation);
      }
      if (data.qtrNo) {
        drawFieldRow('Qtr No.:', data.qtrNo);
      }
    } else {
      drawFieldRow('Selected Location:', data.selectedLocation);
      if (data.specifiedLocation) {
        drawFieldRow('Specified Location:', data.specifiedLocation);
      }
      if (data.qtrNo) {
        drawFieldRow('Qtr No.:', data.qtrNo);
      }
    }
  } else {
    // Legacy fallback
    if (data.complaintLocation && data.complaintLocation !== 'N/A') {
      drawFieldRow('Complaint Location:', data.complaintLocation);
    }
    if (data.siteLocation && data.siteLocation !== 'N/A') {
      drawFieldRow('Site Location:', data.siteLocation);
    }
  }
  drawFieldRow('Nature of Complaint:', data.natureOfComplaint);
  if (data.otherComplaintDetails && data.otherComplaintDetails !== 'N/A') {
    drawFieldRow('Other Complaint Details:', data.otherComplaintDetails);
  }

  // Description block
  checkPageBreak(18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(75, 85, 99);
  doc.text('Complaint Description:', margin + 2, y + 4);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(17, 24, 39);
  const descLines = doc.splitTextToSize(data.description, contentWidth - 4);
  checkPageBreak(descLines.length * 4.5 + 4);
  doc.text(descLines, margin + 2, y);
  y += descLines.length * 4.5 + 4;

  // Section: Status Information
  drawSectionTitle('3. Status & Tracking Information');
  drawFieldRow('Current Status:', data.status);
  drawFieldRow('Priority Level:', data.priority);
  drawFieldRow('Assigned Moderator:', data.assignedModerator);
  drawFieldRow('Filed On (Created):', data.createdDate);
  drawFieldRow('Last Updated:', data.updatedDate);
  y += 2;

  // Section: Resolution Notes if available
  if (data.resolutionNotes && data.resolutionNotes !== 'No notes recorded') {
    drawSectionTitle('4. Official Notes & Audit Trail');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    const noteLines = doc.splitTextToSize(data.resolutionNotes, contentWidth - 4);
    checkPageBreak(noteLines.length * 4 + 4);
    doc.text(noteLines, margin + 2, y);
    y += noteLines.length * 4 + 4;
  }

  // Section: Photograph
  if (data.imageUrl) {
    drawSectionTitle('Photograph Attached');
    try {
      const base64Img = await loadImageAsBase64(data.imageUrl);
      if (base64Img) {
        checkPageBreak(65);
        doc.addImage(base64Img, 'JPEG', margin + 2, y, 70, 50);
        y += 54;
      } else {
        checkPageBreak(10);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(37, 99, 235);
        doc.text(`Attached Photograph URL: ${data.imageUrl}`, margin + 2, y + 4);
        y += 8;
      }
    } catch (e) {
      checkPageBreak(10);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(37, 99, 235);
      doc.text(`Attached Photograph URL: ${data.imageUrl}`, margin + 2, y + 4);
      y += 8;
    }
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(
      `SAIL-MIOM Electrical Maintenance System • Generated on ${new Date().toLocaleString('en-IN')}`,
      margin,
      pageHeight - 6
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 6);
  }

  const filename = `${data.ticketId}.pdf`;
  doc.save(filename);
};
