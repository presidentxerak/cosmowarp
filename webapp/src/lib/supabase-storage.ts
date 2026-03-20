/**
 * Strangrz — Supabase Storage Layer
 *
 * Handles media uploads (images, audio, video, SVG) to Supabase Storage.
 * Falls back gracefully when backend is unavailable.
 */

import { supabase, isBackendAvailable, BUCKETS, getPublicUrl } from './supabase';

/** Convert a data URL to a File/Blob for upload */
function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string; mime: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    // Not a data URL — treat as raw text (e.g., SVG)
    return {
      blob: new Blob([dataUrl], { type: 'text/plain' }),
      ext: 'txt',
      mime: 'text/plain',
    };
  }

  const mime = match[1];
  const base64 = match[2];
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mime });

  // Determine extension from MIME type
  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
  };
  const ext = extMap[mime] || mime.split('/')[1] || 'bin';

  return { blob, ext, mime };
}

/**
 * Upload media to Supabase Storage.
 *
 * @param data - Base64 data URL or raw content
 * @param wartId - The wart ID (used in the path)
 * @param type - 'main' for artwork, 'cover' for audio cover images
 * @returns The storage path, or null on failure
 */
export async function uploadMedia(
  data: string,
  wartId: string,
  type: 'main' | 'cover' = 'main',
): Promise<string | null> {
  if (!isBackendAvailable() || !data) return null;

  try {
    const { blob, ext } = dataUrlToBlob(data);

    // Limit: skip upload if > 50MB
    if (blob.size > 50 * 1024 * 1024) {
      console.warn('[Storage] File too large for upload:', blob.size);
      return null;
    }

    const path = `warts/${wartId}/${type}.${ext}`;

    const { error } = await supabase!.storage
      .from(BUCKETS.MEDIA)
      .upload(path, blob, {
        contentType: blob.type,
        upsert: true,
        cacheControl: '31536000', // 1 year cache
      });

    if (error) {
      console.error('[Storage] uploadMedia:', error.message);
      return null;
    }

    return path;
  } catch (err) {
    console.error('[Storage] uploadMedia failed:', err);
    return null;
  }
}

/**
 * Upload a profile avatar to Supabase Storage.
 */
export async function uploadAvatar(
  data: string,
  address: string,
): Promise<string | null> {
  if (!isBackendAvailable() || !data) return null;

  try {
    const { blob, ext } = dataUrlToBlob(data);
    const path = `profiles/${address}/avatar.${ext}`;

    const { error } = await supabase!.storage
      .from(BUCKETS.AVATARS)
      .upload(path, blob, {
        contentType: blob.type,
        upsert: true,
        cacheControl: '86400', // 1 day cache
      });

    if (error) {
      console.error('[Storage] uploadAvatar:', error.message);
      return null;
    }

    return path;
  } catch (err) {
    console.error('[Storage] uploadAvatar failed:', err);
    return null;
  }
}

/**
 * Upload a profile banner to Supabase Storage.
 */
export async function uploadBanner(
  data: string,
  address: string,
): Promise<string | null> {
  if (!isBackendAvailable() || !data) return null;

  try {
    const { blob, ext } = dataUrlToBlob(data);
    const path = `profiles/${address}/banner.${ext}`;

    const { error } = await supabase!.storage
      .from(BUCKETS.AVATARS)
      .upload(path, blob, {
        contentType: blob.type,
        upsert: true,
        cacheControl: '86400',
      });

    if (error) {
      console.error('[Storage] uploadBanner:', error.message);
      return null;
    }

    return path;
  } catch (err) {
    console.error('[Storage] uploadBanner failed:', err);
    return null;
  }
}

/**
 * Get the public URL for a media file.
 */
export function getMediaUrl(path: string): string {
  if (!path) return '';
  return getPublicUrl(BUCKETS.MEDIA, path);
}

/**
 * Get the public URL for an avatar.
 */
export function getAvatarUrl(path: string): string {
  if (!path) return '';
  return getPublicUrl(BUCKETS.AVATARS, path);
}

/**
 * Delete media from Supabase Storage.
 */
export async function deleteMedia(path: string): Promise<boolean> {
  if (!isBackendAvailable() || !path) return false;
  const { error } = await supabase!.storage.from(BUCKETS.MEDIA).remove([path]);
  return !error;
}

/**
 * Download media and return as data URL.
 * Used for fetching remote media when local cache is missing.
 */
export async function downloadMediaAsDataUrl(path: string): Promise<string | null> {
  if (!isBackendAvailable() || !path) return null;

  try {
    const { data, error } = await supabase!.storage
      .from(BUCKETS.MEDIA)
      .download(path);

    if (error || !data) return null;

    return new Promise((resolve) => {
      const reader = new FileReader();
      const timeout = setTimeout(() => { reader.abort(); resolve(null); }, 30000);
      reader.onload = () => { clearTimeout(timeout); resolve(reader.result as string ?? null); };
      reader.onerror = () => { clearTimeout(timeout); resolve(null); };
      reader.onabort = () => { clearTimeout(timeout); resolve(null); };
      reader.readAsDataURL(data);
    });
  } catch {
    return null;
  }
}

/**
 * Download avatar or banner from Supabase Storage and return as data URL.
 * Tries common extensions (png, jpg, jpeg, webp, gif).
 */
export async function downloadProfileImageAsDataUrl(address: string, type: 'avatar' | 'banner'): Promise<string | null> {
  if (!isBackendAvailable() || !address) return null;

  const extensions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
  for (const ext of extensions) {
    try {
      const path = `profiles/${address}/${type}.${ext}`;
      const { data, error } = await supabase!.storage
        .from(BUCKETS.AVATARS)
        .download(path);

      if (error || !data) continue;

      return new Promise((resolve) => {
        const reader = new FileReader();
        const timeout = setTimeout(() => { reader.abort(); resolve(null); }, 15000);
        reader.onload = () => { clearTimeout(timeout); resolve(reader.result as string ?? null); };
        reader.onerror = () => { clearTimeout(timeout); resolve(null); };
        reader.onabort = () => { clearTimeout(timeout); resolve(null); };
        reader.readAsDataURL(data);
      });
    } catch { continue; }
  }
  return null;
}
