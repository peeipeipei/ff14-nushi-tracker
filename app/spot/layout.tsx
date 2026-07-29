import type { Metadata } from "next";

const title = "釣り場ガイド";
const description =
  "FFXIV の各釣り場で釣れる魚とヌシ、オススメ転移先(最寄りエーテライト)を釣り場ごとに表示します。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/spot" },
  openGraph: {
    title: `${title} | FFXIV 太公望への道`,
    description,
    url: "/spot",
  },
};

export default function SpotLayout({ children }: { children: React.ReactNode }) {
  return children;
}
