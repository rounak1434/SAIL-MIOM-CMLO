const LOCATION_FOOTER = '[Location & Posting Details]';

/**
 * The complainant's description without the appended location footer,
 * matching the per-complaint Excel and PDF exports.
 */
export const getComplaintDescription = (description?: string): string => {
  const raw = description || '';
  return raw.split(LOCATION_FOOTER)[0].trim() || raw.trim();
};

// Escapes text for safe insertion into printed HTML.
export const escapeHtml = (value: unknown): string =>
  (value == null ? '' : String(value))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
