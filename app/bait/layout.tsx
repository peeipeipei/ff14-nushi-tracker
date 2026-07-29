import type { Metadata } from "next";

const title = "餌別ヌシ一覧";
const description =
  "釣り餌ごとに、その餌で釣れる FFXIV のヌシをまとめて表示。狙いたい餌からヌシ釣りを効率よく進められます。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/bait" },
  openGraph: {
    title: `${title} | FFXIV 太公望への道`,
    description,
    url: "/bait",
  },
};

export default function BaitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
