import fs from 'fs';
import path from 'path';

// Store for captured screenshots with in-memory cache, persistent disk storage, and cloud upload
interface StoredScreenshot {
  dataUri: string; // "data:image/jpeg;base64,..."
  contentType: string;
  buffer: Buffer;
  createdAt: number;
}

export const DEFAULT_IMGBB_API_KEY = '4191a860fcd83c0a4fcc50d49e41caa3';

const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'screenshots');
const TMP_SCREENSHOT_DIR = path.join('/tmp', 'screenshots');

function ensureDirExists(dirPath: string) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch {
    // Ignore error if read-only
  }
}

const globalStore = global as unknown as {
  __screenshotStore?: Map<string, StoredScreenshot>;
};

if (!globalStore.__screenshotStore) {
  globalStore.__screenshotStore = new Map();
}

export const screenshotStore = globalStore.__screenshotStore;

/**
 * Saves screenshot locally to memory and disk (/tmp or public/screenshots)
 */
export function saveScreenshotLocal(id: string, dataUri: string): string {
  try {
    const cleanId = id.replace(/\.(jpg|jpeg|png|svg)$/i, '');
    const matches = dataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const contentType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const item: StoredScreenshot = {
        dataUri,
        contentType,
        buffer,
        createdAt: Date.now(),
      };
      screenshotStore.set(cleanId, item);
      screenshotStore.set(id, item);

      // Persist to disk (public/screenshots or /tmp/screenshots for Vercel)
      const ext = contentType.includes('svg') ? 'svg' : contentType.includes('png') ? 'png' : 'jpg';
      let saved = false;
      try {
        ensureDirExists(SCREENSHOT_DIR);
        const filePath = path.join(SCREENSHOT_DIR, `${cleanId}.${ext}`);
        fs.writeFileSync(filePath, buffer);
        saved = true;
      } catch {
        // Fallback for serverless / Vercel where public/ is read-only
      }

      if (!saved) {
        try {
          ensureDirExists(TMP_SCREENSHOT_DIR);
          const tmpFilePath = path.join(TMP_SCREENSHOT_DIR, `${cleanId}.${ext}`);
          fs.writeFileSync(tmpFilePath, buffer);
        } catch (tmpErr) {
          console.warn('Failed to persist screenshot to /tmp:', tmpErr);
        }
      }

      return `/api/screenshot/${cleanId}`;
    }
  } catch (err) {
    console.error('Error saving screenshot locally:', err);
  }
  return dataUri;
}

/**
 * Uploads a screenshot buffer/base64 directly to ImgBB using URLSearchParams
 * and returns the public viewer URL (data.url_viewer e.g., https://ibb.co/xyz).
 */
export async function uploadScreenshotToImgBB(
  imageInput: Buffer | string,
  title?: string
): Promise<string | null> {
  try {
    const apiKey = (process.env.IMGBB_API_KEY || DEFAULT_IMGBB_API_KEY).trim();
    if (!apiKey) return null;

    let base64String = '';
    if (Buffer.isBuffer(imageInput)) {
      base64String = imageInput.toString('base64');
    } else if (typeof imageInput === 'string') {
      base64String = imageInput.replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim();
    }

    if (!base64String) return null;

    const params = new URLSearchParams();
    params.append('image', base64String);
    if (title) {
      params.append('name', title.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 32));
    }

    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: params,
    });

    const imgbbData = await imgbbRes.json();
    const screenshotUrl = imgbbData?.data?.url_viewer || imgbbData?.data?.url;

    if (screenshotUrl) {
      console.log(`[ImgBB] Successfully uploaded screenshot to cloud: ${screenshotUrl}`);
      return screenshotUrl;
    } else {
      console.warn('[ImgBB] Upload response did not contain URL:', imgbbData);
    }
  } catch (err) {
    console.error('[ImgBB] Upload exception:', err);
  }
  return null;
}

/**
 * Main screenshot persistence function:
 * 1. Uploads directly to ImgBB cloud and returns https://ibb.co/...
 * 2. Caches locally in memory/disk as fallback
 */
export async function saveScreenshot(
  id: string,
  dataUri: string,
  title?: string,
  imageToUpload?: string
): Promise<string> {
  const cleanId = id.replace(/\.(jpg|jpeg|png|svg)$/i, '');

  // Always cache locally as instant fallback
  const localUrl = saveScreenshotLocal(cleanId, dataUri);

  // Upload to ImgBB cloud (prioritize JPEG imageToUpload if available, since ImgBB rejects SVG)
  const cloudUrl = await uploadScreenshotToImgBB(imageToUpload || dataUri, title);
  if (cloudUrl) {
    return cloudUrl;
  }

  return localUrl;
}

export function getScreenshot(id: string): StoredScreenshot | undefined {
  const cleanId = id.replace(/\.(jpg|jpeg|png|svg)$/i, '');

  if (screenshotStore.has(cleanId)) {
    return screenshotStore.get(cleanId);
  }
  if (screenshotStore.has(id)) {
    return screenshotStore.get(id);
  }

  // Fallback: Read from disk (public/screenshots or /tmp/screenshots)
  const candidateDirs = [SCREENSHOT_DIR, TMP_SCREENSHOT_DIR];
  for (const dir of candidateDirs) {
    try {
      const svgPath = path.join(dir, `${cleanId}.svg`);
      const jpgPath = path.join(dir, `${cleanId}.jpg`);
      const pngPath = path.join(dir, `${cleanId}.png`);
      let filePath: string | null = null;
      let contentType = 'image/jpeg';

      if (fs.existsSync(svgPath)) {
        filePath = svgPath;
        contentType = 'image/svg+xml';
      } else if (fs.existsSync(jpgPath)) {
        filePath = jpgPath;
        contentType = 'image/jpeg';
      } else if (fs.existsSync(pngPath)) {
        filePath = pngPath;
        contentType = 'image/png';
      }

      if (filePath) {
        const buffer = fs.readFileSync(filePath);
        const dataUri = `data:${contentType};base64,${buffer.toString('base64')}`;
        const item: StoredScreenshot = {
          dataUri,
          contentType,
          buffer,
          createdAt: Date.now(),
        };
        screenshotStore.set(cleanId, item);
        return item;
      }
    } catch {
      // Ignore read errors and try next directory
    }
  }

  return undefined;
}
