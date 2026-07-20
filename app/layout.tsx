import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FF14 ヌシ釣りトラッカー",
  description:
    "エオルゼア時間と天候予測から、ヌシ(伝説の魚)が次に釣れる時間帯をリアルタイムで表示します。",
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
