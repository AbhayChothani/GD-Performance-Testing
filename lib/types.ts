export type ScreenType = 'Mobile' | 'Desktop';

export interface AuditMetrics {
  screenType: ScreenType;
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  totalBlockingTime: number | null;
  screenshotUrl: string | null;
  screenshotDataUri?: string | null;
  reportUrl: string;
  comment: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  errorMessage?: string;
  timestamp?: string;
}

export interface PageAuditItem {
  id: string;
  srNoMobile: number;
  srNoDesktop: number;
  pageName: string;
  pageUrl: string;
  mobile: AuditMetrics;
  desktop: AuditMetrics;
  status: 'pending' | 'running' | 'completed' | 'error';
  errorMessage?: string;
}

export interface ReportMetadata {
  siteName: string;
  siteUrl: string;
  environment: string;
  createdBy: string;
  createdDate: string;
}

export interface PageSpeedApiResponse {
  url: string;
  strategy: 'mobile' | 'desktop';
  pageName?: string;
  metrics: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    totalBlockingTime: number;
  };
  screenshotDataUri?: string;
  screenshotUrl: string;
  reportUrl: string;
  detailReportUrl?: string;
  error?: string;
}

export interface BatchProgress {
  total: number;
  completed: number;
  current: number;
  currentUrl: string;
  currentStrategy: string;
  percentage: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled';
}
