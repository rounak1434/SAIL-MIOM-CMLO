// Parses a Firestore Timestamp, { seconds } object or date string into a Date.
export const parseComplaintDate = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? null : d;
};

// Reads a YYYY-MM-DD date input value as a local calendar day.
const parseDateInput = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

// Returns a message when both dates are set and To Date is earlier than From Date, otherwise ''.
export const getDateRangeError = (dateFrom: string, dateTo: string): string => {
  const from = dateFrom ? parseDateInput(dateFrom) : null;
  const to = dateTo ? parseDateInput(dateTo) : null;
  return from && to && to < from ? 'To Date cannot be earlier than From Date.' : '';
};

/**
 * True when a complaint's creation date falls inside the From/To range (both days inclusive).
 * With no range selected every complaint matches; with a range, undated complaints are excluded.
 */
export const isWithinDateRange = (createdAt: unknown, dateFrom: string, dateTo: string): boolean => {
  if (!dateFrom && !dateTo) return true;

  const created = parseComplaintDate(createdAt);
  if (!created) return false;

  const from = dateFrom ? parseDateInput(dateFrom) : null;
  if (from && created < from) return false;

  const to = dateTo ? parseDateInput(dateTo) : null;
  if (to) {
    to.setHours(23, 59, 59, 999);
    if (created > to) return false;
  }
  return true;
};
