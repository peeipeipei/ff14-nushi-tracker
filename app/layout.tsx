import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const SITE_NAME = "FFXIV 太公望への道";
const SITE_URL = "https://ff14-nushi-tracker.vercel.app";
const SITE_DESC =
  "アチーブメント「太公望」を目指すヌシ釣り支援ツール。エオルゼア時間と天候予測から、ヌシ(伝説の魚)が次に釣れる時間帯をリアルタイムで表示します。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: [
    "FF14",
    "FFXIV",
    "ファイナルファンタジー14",
    "ヌシ",
    "ヌシ釣り",
    "太公望",
    "釣り",
    "フィッシング",
    "エオルゼア時間",
    "天候予測",
    "出現時間",
    "伝説の魚",
    "オオヌシ",
    "アチーブメント",
    "釣り手帳",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESC,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESC,
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "太公望への道",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

/** アドレスバー等の色。PWA の表示色と揃える */
export const viewport: Viewport = {
  themeColor: "#050B18",
  colorScheme: "dark",
};

/** 構造化データ (JSON-LD): 検索エンジンにサイト種別を伝える */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESC,
      inLanguage: "ja",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#webapp`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESC,
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      inLanguage: "ja",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
      about: {
        "@type": "VideoGame",
        name: "ファイナルファンタジーXIV",
        alternateName: "FINAL FANTASY XIV",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="font-body text-moonlight antialiased">
        {children}
        <ServiceWorkerRegister />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
