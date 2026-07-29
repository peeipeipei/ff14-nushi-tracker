import type { Metadata } from "next";

const title = "ヌシ図鑑";
const description =
  "FFXIV のヌシ(伝説の魚)を一覧できる図鑑。拡張・種別・釣獲状況で絞り込み、太公望アチーブメントのコレクション状況を管理できます。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/list" },
  openGraph: {
    title: `${title} | FFXIV 太公望への道`,
    description,
    url: "/list",
  },
};

export default function ListLayout({ children }: { children: React.ReactNode }) {
  return children;
}
