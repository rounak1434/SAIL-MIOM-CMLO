/**
 * Normalizes an Indian phone number to 10 digits.
 * - Strips all non-digit characters.
 * - If 12 digits and starts with '91', strips '91'.
 */
export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}
