import { NextRequest, NextResponse } from 'next/server';
import { getScreenshot } from '@/lib/screenshotStore';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return new NextResponse('Missing screenshot ID', { status: 400 });
  }

  const stored = getScreenshot(id);
  if (stored) {
    return new NextResponse(new Uint8Array(stored.buffer), {
      status: 200,
      headers: {
        'Content-Type': stored.contentType || 'image/jpeg',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        'Content-Length': stored.buffer.length.toString(),
      },
    });
  }

  // Fallback SVG if not in memory or disk
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="#f8fafc">
      <rect width="600" height="400" fill="#1e293b"/>
      <circle cx="300" cy="170" r="45" fill="#334155" />
      <path d="M285 160 L315 160 L315 180 L285 180 Z" stroke="#38bdf8" stroke-width="3" fill="none"/>
      <text x="300" y="250" fill="#94a3b8" font-family="sans-serif" font-size="18" font-weight="bold" text-anchor="middle">PageSpeed Audit Screenshot</text>
      <text x="300" y="280" fill="#64748b" font-family="sans-serif" font-size="14" text-anchor="middle">ID: ${id}</text>
    </svg>
  `.trim();

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
