import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Toaster } from '@/components/ui/sonner';
import AnalyticsProvider from '@/components/AnalyticsProvider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? 'localhost:3000'}`
  ),
  title: "Runner's Spot",
  description: '러너를 위한 짐보관, 샤워실, 탈의실 장소 찾기',
  openGraph: {
    title: "Runner's Spot",
    description: '러너를 위한 짐보관, 샤워실, 탈의실 장소 찾기',
    type: 'website',
    locale: 'ko_KR',
    siteName: "Runner's Spot",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        type: 'image/png',
      },
    ],
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-surface text-text">
        <AnalyticsProvider />
        {children}
        <Toaster position="top-center" richColors />
        <Script
          strategy="afterInteractive"
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}&submodules=gl`}
        />
      </body>
    </html>
  );
}
