export interface PageSpeedCardOptions {
  url: string;
  strategy: 'mobile' | 'desktop';
  pageName?: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  totalBlockingTime?: number | string;
  firstContentfulPaint?: string;
  largestContentfulPaint?: string;
  cumulativeLayoutShift?: string;
  speedIndex?: string;
  screenshotDataUri?: string; // base64 web screenshot or image URL
}

function getScoreColor(score: number): { hex: string; textClass: string; bgClass: string } {
  if (score >= 90) return { hex: '#0cce6b', textClass: 'green', bgClass: '#e6f4ea' };
  if (score >= 50) return { hex: '#ffa400', textClass: 'orange', bgClass: '#fef7e0' };
  return { hex: '#ff4e42', textClass: 'red', bgClass: '#fce8e6' };
}

function parseTimeValue(valStr?: string): number {
  if (!valStr) return 0;
  const cleaned = valStr.replace(/,/g, '').trim();
  const matchS = cleaned.match(/([\d.]+)\s*s/i);
  if (matchS) return parseFloat(matchS[1]) * 1000;
  const matchMs = cleaned.match(/([\d.]+)\s*ms/i);
  if (matchMs) return parseFloat(matchMs[1]);
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function getMetricStatus(
  metric: 'fcp' | 'lcp' | 'tbt' | 'cls' | 'si',
  displayVal?: string,
  numericFallback = 0
): { color: string; shape: 'circle' | 'square' | 'triangle' } {
  const ms = parseTimeValue(displayVal) || numericFallback;

  if (metric === 'fcp') {
    if (ms <= 1800) return { color: '#0cce6b', shape: 'circle' };
    if (ms <= 3000) return { color: '#ffa400', shape: 'square' };
    return { color: '#ff4e42', shape: 'triangle' };
  }
  if (metric === 'lcp') {
    if (ms <= 2500) return { color: '#0cce6b', shape: 'circle' };
    if (ms <= 4000) return { color: '#ffa400', shape: 'square' };
    return { color: '#ff4e42', shape: 'triangle' };
  }
  if (metric === 'tbt') {
    if (ms <= 200) return { color: '#0cce6b', shape: 'circle' };
    if (ms <= 600) return { color: '#ffa400', shape: 'square' };
    return { color: '#ff4e42', shape: 'triangle' };
  }
  if (metric === 'cls') {
    const val = parseFloat(displayVal || '0') || 0;
    if (val <= 0.1) return { color: '#0cce6b', shape: 'circle' };
    if (val <= 0.25) return { color: '#ffa400', shape: 'square' };
    return { color: '#ff4e42', shape: 'triangle' };
  }
  if (metric === 'si') {
    if (ms <= 3400) return { color: '#0cce6b', shape: 'circle' };
    if (ms <= 5800) return { color: '#ffa400', shape: 'square' };
    return { color: '#ff4e42', shape: 'triangle' };
  }

  return { color: '#0cce6b', shape: 'circle' };
}

function renderMetricIcon(shape: 'circle' | 'square' | 'triangle', color: string, x: number, y: number): string {
  if (shape === 'circle') {
    return `<circle cx="${x + 5}" cy="${y + 5}" r="5" fill="${color}" />`;
  }
  if (shape === 'square') {
    return `<rect x="${x}" y="${y}" width="10" height="10" fill="${color}" rx="1" />`;
  }
  return `<path d="M ${x} ${y + 10} L ${x + 6} ${y} L ${x + 12} ${y + 10} Z" fill="${color}" />`;
}

export function generatePageSpeedCardSvg(options: PageSpeedCardOptions): string {
  const {
    url,
    strategy,
    performance = 0,
    accessibility = 0,
    bestPractices = 0,
    seo = 0,
    totalBlockingTime = '0 ms',
    firstContentfulPaint = '1.8 s',
    largestContentfulPaint = '1.8 s',
    cumulativeLayoutShift = '0',
    speedIndex = '4.5 s',
    screenshotDataUri,
  } = options;

  const isMobile = strategy === 'mobile';
  const perfColor = getScoreColor(performance).hex;
  const a11yColor = getScoreColor(accessibility).hex;
  const bpColor = getScoreColor(bestPractices).hex;
  const seoColor = getScoreColor(seo).hex;

  // Gauge arcs
  const smallCirc = 2 * Math.PI * 22; // ~138.2
  const calcSmallOffset = (score: number) => Math.max(0, smallCirc * (1 - Math.min(100, Math.max(0, score)) / 100));

  const largeCirc = 2 * Math.PI * 54; // ~339.29
  const largeOffset = Math.max(0, largeCirc * (1 - Math.min(100, Math.max(0, performance)) / 100));

  // Metric status
  const fcpStatus = getMetricStatus('fcp', firstContentfulPaint);
  const lcpStatus = getMetricStatus('lcp', largestContentfulPaint);
  const tbtNum = typeof totalBlockingTime === 'number' ? totalBlockingTime : parseTimeValue(totalBlockingTime);
  const tbtText = typeof totalBlockingTime === 'string' && totalBlockingTime.includes('ms') ? totalBlockingTime : `${tbtNum} ms`;
  const tbtStatus = getMetricStatus('tbt', tbtText, tbtNum);
  const clsStatus = getMetricStatus('cls', cumulativeLayoutShift);
  const siStatus = getMetricStatus('si', speedIndex);

  // Tab indicator coordinates
  const mobileTabActive = isMobile;
  const mobileTabColor = mobileTabActive ? '#1a73e8' : '#5f6368';
  const desktopTabColor = !mobileTabActive ? '#1a73e8' : '#5f6368';

  const previewImageTag = screenshotDataUri
    ? `<image href="${screenshotDataUri}" x="${isMobile ? 618 : 520}" y="${isMobile ? 220 : 255}" width="${isMobile ? 134 : 270}" height="${isMobile ? 264 : 170}" preserveAspectRatio="xMidYMin slice" clip-path="url(#siteClip)" />`
    : `<rect x="${isMobile ? 618 : 520}" y="${isMobile ? 220 : 255}" width="${isMobile ? 134 : 270}" height="${isMobile ? 264 : 170}" fill="#f8f9fa" clip-path="url(#siteClip)"/>
       <text x="${isMobile ? 685 : 655}" y="${isMobile ? 350 : 340}" font-family="Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" font-size="11" fill="#9aa0a6" text-anchor="middle">Page Preview</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 755" width="900" height="755" style="background:#ffffff;">
  <defs>
    <style>
      .font-sans { font-family: Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
      .bold { font-weight: 700; }
      .medium { font-weight: 500; }
      .regular { font-weight: 400; }
    </style>
    <clipPath id="siteClip">
      ${
        isMobile
          ? `<rect x="618" y="220" width="134" height="264" rx="10" />`
          : `<rect x="520" y="255" width="270" height="170" rx="4" />`
      }
    </clipPath>
    <filter id="shadow" x="-8%" y="-8%" width="116%" height="116%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.1" flood-color="#000000"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="900" height="755" fill="#ffffff" />

  <!-- Navigation Tabs (Mobile / Desktop) -->
  <g transform="translate(0, 0)">
    <!-- Mobile Tab -->
    <g transform="translate(390, 24)" style="cursor:pointer;">
      <path d="M 0 0 L 10 0 C 11.1 0 12 0.9 12 2 L 12 16 C 12 17.1 11.1 18 10 18 L 0 18 C -1.1 18 -2 17.1 -2 16 L -2 2 C -2 0.9 -1.1 0 0 0 Z M 0 2 L 10 2 L 10 14 L 0 14 Z M 5 15.5 C 5.55 15.5 6 15.95 6 16.5 C 6 17.05 5.55 17.5 5 17.5 C 4.45 17.5 4 17.05 4 16.5 C 4 15.95 4.45 15.5 5 15.5 Z" fill="${mobileTabColor}" transform="translate(-16, -2) scale(0.9)"/>
      <text x="2" y="12" class="font-sans medium" font-size="14" fill="${mobileTabColor}">Mobile</text>
      ${mobileTabActive ? `<rect x="-24" y="26" width="76" height="3" fill="#1a73e8" rx="1.5"/>` : ''}
    </g>

    <!-- Desktop Tab -->
    <g transform="translate(485, 24)" style="cursor:pointer;">
      <path d="M 0 0 L 16 0 C 17.1 0 18 0.9 18 2 L 18 11 C 18 12.1 17.1 13 16 13 L 11 13 L 11 15 L 13 15 L 13 17 L 3 17 L 3 15 L 5 15 L 5 13 L 0 13 C -1.1 13 -2 12.1 -2 11 L -2 2 C -2 0.9 -1.1 0 0 0 Z M 0 2 L 16 2 L 16 11 L 0 11 Z" fill="${desktopTabColor}" transform="translate(-16, -1) scale(0.9)"/>
      <text x="4" y="12" class="font-sans medium" font-size="14" fill="${desktopTabColor}">Desktop</text>
      ${!mobileTabActive ? `<rect x="-24" y="26" width="84" height="3" fill="#1a73e8" rx="1.5"/>` : ''}
    </g>

    <!-- Header Divider Line -->
    <line x1="20" y1="52" x2="880" y2="52" stroke="#e0e0e0" stroke-width="1"/>
  </g>

  <!-- Top 4 Gauge Circles + 1 Pill Badge -->
  <g transform="translate(0, 52)">
    <!-- 1. Performance -->
    <g transform="translate(230, 48)">
      <circle cx="0" cy="0" r="22" fill="none" stroke="#e6e6e6" stroke-width="3.5" />
      <circle cx="0" cy="0" r="22" fill="none" stroke="${perfColor}" stroke-width="3.5" stroke-dasharray="${smallCirc}" stroke-dashoffset="${calcSmallOffset(performance)}" stroke-linecap="round" transform="rotate(-90 0 0)" />
      <text x="0" y="6" class="font-sans bold" font-size="16" fill="${perfColor}" text-anchor="middle">${performance}</text>
      <text x="0" y="38" class="font-sans medium" font-size="12" fill="#3c4043" text-anchor="middle">Performance</text>
    </g>

    <!-- 2. Accessibility -->
    <g transform="translate(340, 48)">
      <circle cx="0" cy="0" r="22" fill="none" stroke="#e6e6e6" stroke-width="3.5" />
      <circle cx="0" cy="0" r="22" fill="none" stroke="${a11yColor}" stroke-width="3.5" stroke-dasharray="${smallCirc}" stroke-dashoffset="${calcSmallOffset(accessibility)}" stroke-linecap="round" transform="rotate(-90 0 0)" />
      <text x="0" y="6" class="font-sans bold" font-size="16" fill="${a11yColor}" text-anchor="middle">${accessibility}</text>
      <text x="0" y="38" class="font-sans medium" font-size="12" fill="#3c4043" text-anchor="middle">Accessibility</text>
    </g>

    <!-- 3. Best Practices -->
    <g transform="translate(450, 48)">
      <circle cx="0" cy="0" r="22" fill="none" stroke="#e6e6e6" stroke-width="3.5" />
      <circle cx="0" cy="0" r="22" fill="none" stroke="${bpColor}" stroke-width="3.5" stroke-dasharray="${smallCirc}" stroke-dashoffset="${calcSmallOffset(bestPractices)}" stroke-linecap="round" transform="rotate(-90 0 0)" />
      <text x="0" y="6" class="font-sans bold" font-size="16" fill="${bpColor}" text-anchor="middle">${bestPractices}</text>
      <text x="0" y="38" class="font-sans medium" font-size="12" fill="#3c4043" text-anchor="middle">Best Practices</text>
    </g>

    <!-- 4. SEO -->
    <g transform="translate(560, 48)">
      <circle cx="0" cy="0" r="22" fill="none" stroke="#e6e6e6" stroke-width="3.5" />
      <circle cx="0" cy="0" r="22" fill="none" stroke="${seoColor}" stroke-width="3.5" stroke-dasharray="${smallCirc}" stroke-dashoffset="${calcSmallOffset(seo)}" stroke-linecap="round" transform="rotate(-90 0 0)" />
      <text x="0" y="6" class="font-sans bold" font-size="16" fill="${seoColor}" text-anchor="middle">${seo}</text>
      <text x="0" y="38" class="font-sans medium" font-size="12" fill="#3c4043" text-anchor="middle">SEO</text>
    </g>

    <!-- 5. Agentic Browsing (Pill Badge) -->
    <g transform="translate(670, 48)">
      <rect x="-35" y="-13" width="70" height="26" rx="13" fill="#e6f4ea" />
      <circle cx="-16" cy="0" r="4.5" fill="#137333" />
      <text x="6" y="4.5" class="font-sans bold" font-size="12" fill="#137333" text-anchor="middle">3/3</text>
      <text x="0" y="38" class="font-sans medium" font-size="12" fill="#3c4043" text-anchor="middle">Agentic Browsing</text>
    </g>

    <!-- Thin Divider Line below badges -->
    <line x1="20" y1="98" x2="880" y2="98" stroke="#e0e0e0" stroke-width="1"/>
  </g>

  <!-- Middle Section: Left Gauge & Subtext + Right Preview Mockup -->
  <g transform="translate(0, 150)">
    <!-- LEFT SIDE: Large Performance Circular Gauge -->
    <g transform="translate(240, 140)">
      <!-- Outer track ring -->
      <circle cx="0" cy="0" r="54" fill="none" stroke="#e6e6e6" stroke-width="8" />
      <!-- Colored score arc ring -->
      <circle cx="0" cy="0" r="54" fill="none" stroke="${perfColor}" stroke-width="8" stroke-dasharray="${largeCirc}" stroke-dashoffset="${largeOffset}" stroke-linecap="round" transform="rotate(-90 0 0)" />
      <!-- Center Score -->
      <text x="0" y="14" class="font-sans bold" font-size="38" fill="${perfColor}" text-anchor="middle">${performance}</text>

      <!-- Label below gauge -->
      <text x="0" y="80" class="font-sans medium" font-size="19" fill="#202124" text-anchor="middle">Performance</text>

      <!-- Subtitle Description -->
      <text x="0" y="106" class="font-sans regular" font-size="11" fill="#5f6368" text-anchor="middle">Values are estimated and may vary. The <tspan fill="#1a73e8" style="cursor:pointer;">performance score is calculated</tspan></text>
      <text x="0" y="122" class="font-sans regular" font-size="11" fill="#5f6368" text-anchor="middle">directly from these metrics. <tspan fill="#1a73e8" style="cursor:pointer;">See calculator.</tspan></text>

      <!-- Scale Legend (Triangle Red 0-49, Square Orange 50-89, Circle Green 90-100) -->
      <g transform="translate(-85, 146)">
        <!-- 0-49 -->
        <path d="M 0 8 L 5 0 L 10 8 Z" fill="#ff4e42" />
        <text x="14" y="8" class="font-sans regular" font-size="11" fill="#5f6368">0–49</text>

        <!-- 50-89 -->
        <rect x="58" y="0" width="8" height="8" fill="#ffa400" />
        <text x="70" y="8" class="font-sans regular" font-size="11" fill="#5f6368">50–89</text>

        <!-- 90-100 -->
        <circle cx="128" cy="4" r="4.5" fill="#0cce6b" />
        <text x="137" y="8" class="font-sans regular" font-size="11" fill="#5f6368">90–100</text>
      </g>
    </g>

    <!-- Vertical Divider Line -->
    <line x1="450" y1="60" x2="450" y2="300" stroke="#f1f3f4" stroke-width="1.5" />

    <!-- RIGHT SIDE: Site Preview Mockup Frame -->
    <g>
      ${
        isMobile
          ? `<!-- Mobile Device Mockup Frame -->
             <g filter="url(#shadow)">
               <rect x="616" y="218" width="138" height="268" rx="12" fill="#ffffff" stroke="#dadce0" stroke-width="1.5"/>
             </g>
             ${previewImageTag}
             <!-- Mobile home bar indicator -->
             <rect x="665" y="476" width="40" height="3" rx="1.5" fill="#dadce0"/>`
          : `<!-- Desktop Browser Mockup Frame -->
             <g filter="url(#shadow)">
               <rect x="518" y="235" width="274" height="192" rx="6" fill="#ffffff" stroke="#dadce0" stroke-width="1.5"/>
               <!-- Browser title bar -->
               <rect x="518" y="235" width="274" height="20" rx="6" fill="#f1f3f4"/>
               <circle cx="530" cy="245" r="3" fill="#ea4335" />
               <circle cx="538" cy="245" r="3" fill="#fbbc04" />
               <circle cx="546" cy="245" r="3" fill="#34a853" />
             </g>
             ${previewImageTag}`
      }
    </g>
  </g>

  <!-- Bottom Section: METRICS -->
  <g transform="translate(0, 480)">
    <!-- Header -->
    <text x="20" y="28" class="font-sans bold" font-size="11" fill="#5f6368" letter-spacing="1">METRICS</text>
    <text x="880" y="28" class="font-sans regular" font-size="12" fill="#5f6368" text-anchor="end" style="cursor:pointer;">Expand view</text>
    <line x1="20" y1="38" x2="880" y2="38" stroke="#e0e0e0" stroke-width="1"/>

    <!-- Left Column Metrics -->
    <!-- Metric 1: First Contentful Paint -->
    <g transform="translate(20, 62)">
      ${renderMetricIcon(fcpStatus.shape, fcpStatus.color, 0, 0)}
      <text x="20" y="9" class="font-sans regular" font-size="13" fill="#202124">First Contentful Paint</text>
      <text x="20" y="38" class="font-sans regular" font-size="24" fill="${fcpStatus.color}">${firstContentfulPaint}</text>
    </g>

    <!-- Metric 2: Total Blocking Time -->
    <g transform="translate(20, 132)">
      ${renderMetricIcon(tbtStatus.shape, tbtStatus.color, 0, 0)}
      <text x="20" y="9" class="font-sans regular" font-size="13" fill="#202124">Total Blocking Time</text>
      <text x="20" y="38" class="font-sans regular" font-size="24" fill="${tbtStatus.color}">${tbtText}</text>
    </g>

    <!-- Metric 3: Speed Index -->
    <g transform="translate(20, 202)">
      ${renderMetricIcon(siStatus.shape, siStatus.color, 0, 0)}
      <text x="20" y="9" class="font-sans regular" font-size="13" fill="#202124">Speed Index</text>
      <text x="20" y="38" class="font-sans regular" font-size="24" fill="${siStatus.color}">${speedIndex}</text>
    </g>

    <!-- Right Column Metrics -->
    <!-- Metric 4: Largest Contentful Paint -->
    <g transform="translate(470, 62)">
      ${renderMetricIcon(lcpStatus.shape, lcpStatus.color, 0, 0)}
      <text x="20" y="9" class="font-sans regular" font-size="13" fill="#202124">Largest Contentful Paint</text>
      <text x="20" y="38" class="font-sans regular" font-size="24" fill="${lcpStatus.color}">${largestContentfulPaint}</text>
    </g>

    <!-- Metric 5: Cumulative Layout Shift -->
    <g transform="translate(470, 132)">
      ${renderMetricIcon(clsStatus.shape, clsStatus.color, 0, 0)}
      <text x="20" y="9" class="font-sans regular" font-size="13" fill="#202124">Cumulative Layout Shift</text>
      <text x="20" y="38" class="font-sans regular" font-size="24" fill="${clsStatus.color}">${cumulativeLayoutShift}</text>
    </g>
  </g>
</svg>`;
}

export function generatePageSpeedCardDataUri(options: PageSpeedCardOptions): string {
  const svg = generatePageSpeedCardSvg(options);
  const base64 = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
