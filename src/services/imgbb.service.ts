/**
 * SAIL-MIOM – Direct ImgBB Image Upload Service
 * ============================================================
 * Uploads complaint images directly to ImgBB (https://api.imgbb.com/1/upload)
 * using multipart/form-data.
 *
 * NOTE ON SECURITY ARCHITECTURE:
 * - VITE_IMGBB_API_KEY is embedded in the Vite client-side bundle.
 * - This key is visible to client browsers inspecting network traffic.
 * - This is by design: no server-side function, proxy, or Firebase Storage
 *   is used, allowing the application to operate fully within the Firebase
 *   Spark (free) tier.
 * - Firebase Admin private keys, service account credentials, and passwords
 *   are NEVER exposed here.
 * ============================================================
 */

const getApiKey = (): string => {
  const envKey = import.meta.env.VITE_IMGBB_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  return '';
};


export const uploadToImgBB = async (file: File): Promise<string> => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error(
      'ImgBB API key is not configured. Please set VITE_IMGBB_API_KEY in your .env file.'
    );
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size should be less than 5MB');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload a valid image file (PNG, JPG, WEBP, etc.)');
  }

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${apiKey}`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `Image upload failed with status ${response.status}`
    );
  }

  const result = await response.json();
  if (!result.data || !result.data.url) {
    throw new Error('Upload response did not contain a valid image URL');
  }

  return result.data.url as string;
};

