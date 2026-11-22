import { NextRequest, NextResponse } from 'next/server';
import { getScreenshot } from '@/lib/screenshotStore';
import { generatePageSpeedCardSvg } from '@/lib/pageSpeedCardGenerator';
import { findKnownAudit } from '@/lib/pagespeed';
import { DEMO_ITEMS } from '@/lib/demoData';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return new NextResponse('Missing screenshot ID', { status: 400 });
  }

  // 1. Check if screenshot exists in server memory or disk
  const stored = getScreenshot(id);
  if (stored) {
    return new NextResponse(new Uint8Array(stored.buffer), {
      status: 200,
      headers: {
        'Content-Type': stored.contentType || 'image/svg+xml; charset=utf-8',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        'Content-Length': stored.buffer.length.toString(),
      },
    });
  }

  // 2. Serverless recovery: generate on-the-fly from query parameters
  const searchParams = req.nextUrl.searchParams;
  const url = searchParams.get('url') || '';
  const strategy = (
    searchParams.get('strategy') || (id.toLowerCase().includes('desktop') ? 'desktop' : 'mobile')
  ) as 'mobile' | 'desktop';
  const perf = parseInt(searchParams.get('p') || '0', 10);
  const a11y = parseInt(searchParams.get('a') || '0', 10);
  const bp = parseInt(searchParams.get('b') || '0', 10);
  const seo = parseInt(searchParams.get('s') || '0', 10);
  const tbt = searchParams.get('tbt') || '180 ms';
  const fcp = searchParams.get('fcp') || '1.8 s';
  const lcp = searchParams.get('lcp') || '1.8 s';
  const cls = searchParams.get('cls') || '0';
  const si = searchParams.get('si') || '5.6 s';

  if (perf > 0) {
    const cardSvg = generatePageSpeedCardSvg({
      url: url || 'https://www.girirajdigital.com/',
      strategy,
      performance: perf,
      accessibility: a11y || 98,
      bestPractices: bp || 96,
      seo: seo || 100,
      totalBlockingTime: tbt,
      firstContentfulPaint: fcp,
      largestContentfulPaint: lcp,
      cumulativeLayoutShift: cls,
      speedIndex: si,
    });

    const buffer = Buffer.from(cardSvg, 'utf-8');
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        'Content-Length': buffer.length.toString(),
      },
    });
  }

  // 3. Fallback: check if id or url matches a known item in Book.xlsx / DEMO_ITEMS
  const cleanId = id.replace(/\.(jpg|jpeg|png|svg)$/i, '').toLowerCase();
  const known = url
    ? findKnownAudit(url)
    : DEMO_ITEMS.find((item) => {
        const slug = (item.pageName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return cleanId.includes(slug) || cleanId.includes(item.id.toLowerCase());
      }) || DEMO_ITEMS[0];

  if (known) {
    const isDesk = strategy === 'desktop';
    const metrics = isDesk ? known.desktop : known.mobile;
    const cardSvg = generatePageSpeedCardSvg({
      url: known.pageUrl,
      strategy: isDesk ? 'desktop' : 'mobile',
      pageName: known.pageName,
      performance: metrics.performance || (isDesk ? 95 : 85),
      accessibility: metrics.accessibility || 98,
      bestPractices: metrics.bestPractices || 96,
      seo: metrics.seo || 100,
      totalBlockingTime: metrics.totalBlockingTime ? `${metrics.totalBlockingTime} ms` : '180 ms',
      firstContentfulPaint: isDesk ? '0.9 s' : '1.8 s',
      largestContentfulPaint: isDesk ? '1.1 s' : '1.8 s',
      cumulativeLayoutShift: '0',
      speedIndex: isDesk ? '1.8 s' : '5.6 s',
    });

    const buffer = Buffer.from(cardSvg, 'utf-8');
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        'Content-Length': buffer.length.toString(),
      },
    });
  }

  // 4. Generic PageSpeed Card matching image.png for any other request
  const cardSvg = generatePageSpeedCardSvg({
    url: 'https://www.girirajdigital.com/',
    strategy: 'mobile',
    pageName: 'Home page',
    performance: 91,
    accessibility: 98,
    bestPractices: 96,
    seo: 100,
    totalBlockingTime: '180 ms',
    firstContentfulPaint: '1.8 s',
    largestContentfulPaint: '1.8 s',
    cumulativeLayoutShift: '0',
    speedIndex: '6.0 s',
  });

  const buffer = Buffer.from(cardSvg, 'utf-8');
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=86400',
      'Content-Length': buffer.length.toString(),
    },
  });
}
