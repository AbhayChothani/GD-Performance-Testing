import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    // If targetUrl doesn't end in .xml, check /sitemap.xml
    if (!targetUrl.toLowerCase().endsWith('.xml')) {
      const parsed = new URL(targetUrl);
      targetUrl = `${parsed.origin}/sitemap.xml`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/xml, text/xml, */*',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Could not fetch sitemap from ${targetUrl} (HTTP ${response.status})` },
        { status: 404 }
      );
    }

    const xml = await response.text();
    const locRegex = /<loc>\s*(https?:\/\/[^\s<]+)\s*<\/loc>/gi;
    const extractedUrls: string[] = [];
    let match;

    while ((match = locRegex.exec(xml)) !== null) {
      extractedUrls.push(match[1]);
    }

    if (extractedUrls.length === 0) {
      return NextResponse.json(
        { error: 'No URLs found in the specified sitemap.' },
        { status: 404 }
      );
    }

    // Check if extracted URLs are sub-sitemaps (e.g. sitemap_pages.xml)
    const xmlSubSitemaps = extractedUrls.filter((u) => u.toLowerCase().endsWith('.xml'));

    if (xmlSubSitemaps.length > 0 && xmlSubSitemaps.length === extractedUrls.length) {
      // It's a sitemap index! Fetch up to first 3 sub-sitemaps to gather URLs
      const subUrls: string[] = [];
      for (const subSitemap of xmlSubSitemaps.slice(0, 3)) {
        try {
          const subRes = await fetch(subSitemap, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          });
          if (subRes.ok) {
            const subXml = await subRes.text();
            let subMatch;
            const subLocRegex = /<loc>\s*(https?:\/\/[^\s<]+)\s*<\/loc>/gi;
            while ((subMatch = subLocRegex.exec(subXml)) !== null) {
              if (!subMatch[1].toLowerCase().endsWith('.xml')) {
                subUrls.push(subMatch[1]);
              }
            }
          }
        } catch {
          // ignore individual sub-sitemap failure
        }
      }

      const unique = Array.from(new Set(subUrls));
      return NextResponse.json({
        sitemapUrl: targetUrl,
        count: unique.length,
        urls: unique,
      });
    }

    const unique = Array.from(new Set(extractedUrls));
    return NextResponse.json({
      sitemapUrl: targetUrl,
      count: unique.length,
      urls: unique,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sitemap';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
