// Cloudinary persistent backup for Shelby blobs.
// Uses raw HTTP API — no SDK dependency.
// Env vars: CLOUDINARY_URL (format: cloudinary://api_key:api_secret@cloud_name)
//   OR: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

import { createHash, createHmac } from 'node:crypto';

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function getConfig(): CloudinaryConfig | null {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (url) {
    // Parse cloudinary://api_key:api_secret@cloud_name
    const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (match) {
      return { apiKey: match[1]!, apiSecret: match[2]!, cloudName: match[3]! };
    }
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? '';
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() ?? '';

  if (cloudName && apiKey && apiSecret) {
    return { cloudName, apiKey, apiSecret };
  }

  return null;
}

function generateSignature(params: Record<string, string | number>, apiSecret: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHmac('sha256', apiSecret).update(sorted).digest('hex');
}

export function isCloudinaryAvailable(): boolean {
  return getConfig() !== null;
}

export async function uploadToCloudinary(
  publicId: string,
  buffer: Buffer,
  folder: string = 'verida-blobs',
): Promise<string | null> {
  const config = getConfig();
  if (!config) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = {
    folder,
    public_id: publicId,
    timestamp,
  };
  const signature = generateSignature(params, config.apiSecret);

  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(buffer)]), publicId);
  formData.append('folder', folder);
  formData.append('public_id', publicId);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', config.apiKey);
  formData.append('signature', signature);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/raw/upload`,
      { method: 'POST', body: formData },
    );

    if (!res.ok) {
      console.warn(`[Cloudinary] Upload failed: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = (await res.json()) as { secure_url?: string; public_id?: string };
    return data.secure_url ?? null;
  } catch (err) {
    console.warn('[Cloudinary] Upload error:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function downloadFromCloudinary(
  publicId: string,
  folder: string = 'verida-blobs',
): Promise<Buffer | null> {
  const config = getConfig();
  if (!config) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = {
    public_id: `${folder}/${publicId}`,
    timestamp,
  };
  const signature = generateSignature(params, config.apiSecret);

  const url = new URL(`https://api.cloudinary.com/v1_1/${config.cloudName}/raw/download`);
  url.searchParams.set('public_id', `${folder}/${publicId}`);
  url.searchParams.set('timestamp', String(timestamp));
  url.searchParams.set('api_key', config.apiKey);
  url.searchParams.set('signature', signature);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export function getCloudinaryFolder(): string {
  return process.env.CLOUDINARY_FOLDER?.trim() ?? 'verida-blobs';
}
