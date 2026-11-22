import { NextRequest, NextResponse } from 'next/server';
import { generateExcelWorkbook } from '@/lib/excelExport';
import { PageAuditItem, ReportMetadata } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { items, metadata } = (await req.json()) as {
      items: PageAuditItem[];
      metadata: ReportMetadata;
    };

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Valid items array is required' }, { status: 400 });
    }

    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    const forwardedHost =
      req.headers.get('x-forwarded-host') || req.headers.get('host');
    let origin = '';
    if (forwardedHost) {
      origin = `${forwardedProto}://${forwardedHost}`;
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      origin = process.env.NEXT_PUBLIC_APP_URL;
    } else if (process.env.VERCEL_URL) {
      origin = `https://${process.env.VERCEL_URL}`;
    } else {
      origin = req.nextUrl?.origin || '';
    }
    origin = origin.replace(/\/+$/, '');

    const workbook = await generateExcelWorkbook(items, metadata || {}, origin);
    const buffer = await workbook.xlsx.writeBuffer();

    const siteName = (metadata?.siteName || 'Audit').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `PageSpeed_QA_Report_${siteName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
