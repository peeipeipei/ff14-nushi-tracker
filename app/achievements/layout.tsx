import type { Metadata } from "next";

const title = "太公望アチーブメント";
const description =
  "FFXIV の釣りアチーブメント「太公望」シリーズの一覧と達成状況。各段階で狙うべきヌシを確認できます。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/achievements" },
  openGraph: {
    title: `${title} | FFXIV 太公望への道`,
    description,
    url: "/achievements",
  },
};

export default function AchievementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
