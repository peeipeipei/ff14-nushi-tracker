import type { Metadata } from "next";

const title = "データのバックアップ";
const description =
  "釣獲・下ごしらえ・ピン留めの記録をファイルに書き出し／復元します。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/backup" },
  // 各自の記録操作用ページのため検索インデックス対象外
  robots: { index: false, follow: true },
};

export default function BackupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
