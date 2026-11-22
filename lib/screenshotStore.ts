import fs from 'fs';
import path from 'path';

// Store for captured screenshots with in-memory cache and persistent disk storage
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

export function saveScreenshot(id: string, dataUri: string): string {
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
    console.error('Error saving screenshot to store:', err);
  }
  return dataUri;
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
