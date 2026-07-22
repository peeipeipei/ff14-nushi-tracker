import type { Metadata } from "next";
import "./globals.css";

const SITE_NAME = "FFXIV 太公望への道";
const SITE_DESC =
  "アチーブメント「太公望」を目指すヌシ釣り支援ツール。エオルゼア時間と天候予測から、ヌシ(伝説の魚)が次に釣れる時間帯をリアルタイムで表示します。";

export const metadata: Metadata = {
  metadataBase: new URL("https://ff14-nushi-tracker.vercel.app"),
  title: {
    default: SITE_NAME,
    template: `%s`,
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESC,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESC,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="font-body text-moonlight antialiased">{children}</body>
    </html>
  );
}
