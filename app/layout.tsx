import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'Revify Outreach | AI-Powered Lead Research',
  description: 'Research smarter, close faster. AI-powered B2B lead research and personalized outreach for GoHighLevel.',
  keywords: ['lead research', 'B2B sales', 'AI outreach', 'GoHighLevel', 'sales intelligence'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
