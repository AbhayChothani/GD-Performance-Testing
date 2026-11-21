import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PageSpeed QA Report Generator | Giriraj Digital Style',
  description:
    'Automate website performance QA audits via Google PageSpeed Insights and generate exact 12-column styled Excel (.xlsx) and Google Sheets reports matching Book.xlsx.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-100 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
