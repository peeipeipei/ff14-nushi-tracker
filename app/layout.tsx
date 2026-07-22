import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FFXIV 太公望への道",
  description:
    "アチーブメント「太公望」を目指すヌシ釣り支援ツール。エオルゼア時間と天候予測から、ヌシ(伝説の魚)が次に釣れる時間帯をリアルタイムで表示します。",
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
