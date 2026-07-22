import Link from "next/link";
import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "このサイトについて | FFXIV 太公望への道",
  description:
    "FFXIV 太公望への道の使い方・データ出典・免責事項。ヌシ釣りアチーブメント「太公望」達成を支援する非公式ファンツールです。",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-abyss-700 bg-abyss-900/70 p-5 shadow-deep">
      <h2 className="mb-2 font-display text-lg text-moonlight">{title}</h2>
      <div className="space-y-2 text-sm text-moonlight-dim">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <div className="mb-1">
          <Link href="/" className="text-sm text-moonlight-dim underline hover:text-moonlight">
            ← トラッカーに戻る
          </Link>
        </div>
        <h1 className="font-display text-3xl font-bold text-moonlight">
          このサイトに<span className="text-hookgold">ついて</span>
        </h1>
        <p className="mt-1 text-sm text-moonlight-dim">
          FFXIV 太公望への道 — ヌシ釣り支援ツール
        </p>
      </header>

      <div className="space-y-5">
        <Section title="できること">
          <p>
            FINAL FANTASY XIV のヌシ(大物・伝説の魚)が「次にいつ釣れるか」を、
            エオルゼア時間と天候予測からリアルタイムに計算して表示します。
            アチーブメント「太公望」シリーズの達成を支援するツールです。
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>ヌシ一覧: 出現が近い順に並び、残り時間・天候・釣り場を表示</li>
            <li>拡張・状態・種別・フィッシュアイでの絞り込みと並び替え</li>
            <li>魚名をタップで釣り方(餌・泳がせ・漁師の直感)とマップを表示</li>
            <li>釣り場ページ: その釣り場で釣れる魚とオススメ転移先</li>
            <li>アチーブメント: 太公望シリーズの進捗と狙い目</li>
            <li>釣獲チェック・ピン留めはブラウザに自動保存されます</li>
          </ul>
        </Section>

        <Section title="データ出典・クレジット">
          <p>魚・天候・釣り場などのデータおよび画像は以下を利用しています。</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              魚データ・天候アルゴリズム:{" "}
              <a
                href="https://github.com/icykoneko/ff14-fish-tracker-app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-hookgold underline"
              >
                ff14-fish-tracker-app
              </a>
            </li>
            <li>アイコン・マップ画像・アチーブメント: XIVAPI</li>
            <li>エーテライト(転移先): FFXIV Teamcraft</li>
            <li>魚の各種ページへのリンク: The Lodestone(エオルゼアデータベース)</li>
          </ul>
        </Section>

        <Section title="免責事項">
          <p>
            本サイトはファンによる<strong className="text-moonlight">非公式</strong>
            サイトであり、株式会社スクウェア・エニックスとは一切関係ありません。
            広告掲載などの商用・営利目的では運営していません。
          </p>
          <p>
            表示される出現率・釣り上げ確率等はあくまで推定であり、正確性を保証するものでは
            ありません。ゲーム内の情報を優先してください。
          </p>
          <p className="pt-1 text-xs text-moonlight-faint">
            FINAL FANTASY XIV © SQUARE ENIX CO., LTD. All Rights Reserved.
          </p>
        </Section>
      </div>

      <SiteFooter />
    </main>
  );
}
