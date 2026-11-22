import fs from 'fs';
import path from 'path';

// Store for captured screenshots with in-memory cache, persistent disk storage, and cloud upload
interface StoredScreenshot {
  dataUri: string; // "data:image/jpeg;base64,..."
  contentType: string;
  buffer: Buffer;
  createdAt: number;
}

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
 * Uploads screenshot to ImgBB (using IMGBB_API_KEY) or Cloudinary (using CLOUDINARY_URL)
 * and returns the public shareable viewer URL (e.g., https://ibb.co/xyz or https://res.cloudinary.com/...)
 */
export async function uploadToCloud(
  cleanId: string,
  dataUri: string,
  title?: string
): Promise<string | null> {
  const imgbbApiKey = process.env.IMGBB_API_KEY?.trim();
  const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();

  // 1. Try ImgBB if IMGBB_API_KEY is configured
  if (imgbbApiKey) {
    try {
      const rawBase64 = dataUri.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
      const formData = new FormData();
      formData.append('image', rawBase64);
      formData.append('name', (title || cleanId).replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 32));

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          // ImgBB returns url_viewer (e.g. https://ibb.co/2ndCYJK) which opens the clean webpage just like prnt.sc
          const viewerUrl = json.data.url_viewer || json.data.url || json.data.display_url;
          console.log(`[ImgBB] Successfully uploaded screenshot to public cloud: ${viewerUrl}`);
          return viewerUrl;
        }
      } else {
        const errText = await res.text();
        console.warn('[ImgBB] Upload API returned status', res.status, errText);
      }
    } catch (imgbbErr) {
      console.warn('[ImgBB] Upload error:', imgbbErr);
    }
  }

  // 2. Try Cloudinary if CLOUDINARY_URL is configured
  if (cloudinaryUrl) {
    try {
      const match = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@([^/]+)/);
      if (match) {
        const [, apiKey, apiSecret, cloudName] = match;
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const crypto = await import('crypto');
        const signature = crypto
          .createHash('sha1')
          .update(`timestamp=${timestamp}${apiSecret}`)
          .digest('hex');

        const formData = new FormData();
        formData.append('file', dataUri);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const json = await res.json();
          if (json.secure_url) {
            console.log(`[Cloudinary] Successfully uploaded screenshot: ${json.secure_url}`);
            return json.secure_url;
          }
        }
      }
    } catch (cloudErr) {
      console.warn('[Cloudinary] Upload error:', cloudErr);
    }
  }

  return null;
}

/**
 * Main screenshot persistence function:
 * 1. Always saves locally in memory & disk as fallback
 * 2. Uploads to ImgBB / Cloudinary if configured and returns public viewer URL
 */
export async function saveScreenshot(
  id: string,
  dataUri: string,
  title?: string
): Promise<string> {
  const cleanId = id.replace(/\.(jpg|jpeg|png|svg)$/i, '');
  const localUrl = saveScreenshotLocal(cleanId, dataUri);

  // Attempt cloud upload
  const cloudUrl = await uploadToCloud(cleanId, dataUri, title);
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
