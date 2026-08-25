import Link from "next/link";
import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "技術解説",
  description:
    "FFXIV 太公望への道の技術解説。エオルゼア時間・天候予測アルゴリズムの再現、完全クライアントサイド計算、データパイプライン、SEO 最適化までの実装をまとめています。",
  alternates: { canonical: "/tech" },
  openGraph: {
    title: "技術解説 | FFXIV 太公望への道",
    description:
      "エオルゼア時間・天候予測アルゴリズムの再現から静的配信・データパイプラインまで、実装の要点を解説します。",
    url: "/tech",
  },
};

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-abyss-700 bg-abyss-900/70 p-5 shadow-deep sm:p-6">
      {eyebrow && (
        <div className="mb-1 text-xs font-bold uppercase tracking-widest text-hookgold">
          {eyebrow}
        </div>
      )}
      <h2 className="mb-3 font-display text-lg text-moonlight sm:text-xl">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-moonlight-dim">
        {children}
      </div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-abyss-700 bg-abyss p-3 text-xs leading-relaxed text-moonlight">
      <code className="font-mono">{children}</code>
    </pre>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="rounded-lg border border-abyss-700 bg-abyss-800 px-3 py-3 text-center">
      <div className="font-display text-2xl font-bold text-hookgold-bright">{n}</div>
      <div className="mt-0.5 text-xs text-moonlight-faint">{label}</div>
    </div>
  );
}

export default function TechPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/" className="text-moonlight-dim underline hover:text-moonlight">
            ← トラッカーに戻る
          </Link>
          <Link href="/about" className="text-moonlight-dim underline hover:text-moonlight">
            このサイトについて
          </Link>
        </div>
        <h1 className="font-display text-3xl font-bold text-moonlight">
          技術<span className="text-hookgold">解説</span>
        </h1>
        <p className="mt-1 text-sm text-moonlight-dim">
          このサイトがどう作られているか — アルゴリズムと設計の要点
        </p>
      </header>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat n="335" label="掲載ヌシ" />
        <Stat n="0" label="サーバーAPI" />
        <Stat n="~4,200" label="行 (TS+Py)" />
      </div>

      <div className="space-y-5">
        <Section eyebrow="Overview" title="何をするサイトか">
          <p>
            FINAL FANTASY XIV の「ヌシ」(出現時間・天候が限定された大物)が
            <strong className="text-moonlight">次にいつ釣れるか</strong>を、
            エオルゼア時間と天候予測から算出してリアルタイムに一覧表示する Web アプリです。
            アチーブメント「太公望」シリーズの達成支援を目的としています。
          </p>
          <p>
            肝は<strong className="text-moonlight">「未来の天候を正確に先読みする」</strong>点。
            FF14 の天候はサーバー乱数ではなく時刻から決定論的に決まるため、
            クライアント側だけで何日先でも計算できます。
          </p>
        </Section>

        <Section eyebrow="Stack" title="技術スタック">
          <ul className="ml-4 list-disc space-y-1">
            <li>Next.js 14 (App Router) + TypeScript + Tailwind CSS</li>
            <li>
              <strong className="text-moonlight">完全クライアントサイド計算</strong> —
              バックエンド API・DB を持たず、全ページを静的プリレンダリングして Vercel から配信
            </li>
            <li>データ生成は Python (`extract_nushi.py`)。永続化は localStorage のみ</li>
          </ul>
          <p>
            サーバーを持たないことで、ランニングコストゼロ・障害点ゼロ・表示速度最速
            (First Load JS 約 90–150KB) を実現しています。
          </p>
        </Section>

        <Section eyebrow="Algorithm 1" title="エオルゼア時間の変換">
          <p>
            ゲーム内時間 (ET) はリアルの <strong className="text-moonlight">3600/175 ≒ 20.57 倍速</strong>。
            ET1時間 = リアル175秒、ET1日 = リアル70分で、unix エポックが ET 0:00 に一致します。
          </p>
          <Code>{`export const EORZEA_MULTIPLIER = 3600 / 175;      // ≒ 20.57
export const REAL_MS_PER_EORZEA_HOUR = 175 * 1000; // ET1時間
// 天候窓は ET8時間 = リアル 23分20秒 ごとに切り替わる
export const WEATHER_WINDOW_REAL_MS = 8 * REAL_MS_PER_EORZEA_HOUR;`}</Code>
        </Section>

        <Section eyebrow="Algorithm 2" title="天候予測 — 決定論ハッシュの再現">
          <p>
            天候は「時刻から求まる 0–99 の疑似乱数値」と「ゾーンごとの累積確率テーブル」で決まります。
            この乱数値 (forecastTarget) を、FF14 クライアントと
            <strong className="text-moonlight">ビット演算まで一致</strong>させて再現しているのが核心部分です。
          </p>
          <Code>{`export function calculateForecastTarget(unixMs: number): number {
  const unixSeconds = Math.floor(unixMs / 1000);
  const bell = unixSeconds / 175;
  const increment = (bell + 8 - (bell % 8)) % 24;
  const totalDays = Math.floor(unixSeconds / 4200);
  const calcBase = (totalDays * 100 + increment) >>> 0;
  const step1 = ((calcBase << 11) ^ calcBase) >>> 0;
  const step2 = ((step1 >>> 8) ^ step1) >>> 0;
  return step2 % 100;   // 0–99
}`}</Code>
          <p>
            あとは累積確率テーブルを引くだけ。<code className="text-hookgold-bright">{`>>> 0`}</code> で
            符号なし32bitに畳んでいるのは、JS の数値と C++ クライアントの挙動を合わせるためです。
          </p>
        </Section>

        <Section eyebrow="Algorithm 3" title="「次に釣れる窓」の探索">
          <p>
            ヌシの出現条件は最大3つ —{" "}
            <strong className="text-moonlight">時間帯</strong>(ET) ×{" "}
            <strong className="text-moonlight">天候</strong> ×{" "}
            <strong className="text-moonlight">直前の天候</strong>。
            これらの積集合が「釣れる窓」です。実装では現在時刻以降の天候窓を順に走査し、
          </p>
          <ol className="ml-4 list-decimal space-y-1">
            <li>天候条件 (現在・直前) を満たす窓だけに絞り込み</li>
            <li>その窓 [0,8) ET と魚の時間帯 [start,end) の交差区間を算出 (日跨ぎ対応)</li>
            <li>窓境界にまたがって条件が続く場合は区間を連結して1つの窓に延長</li>
          </ol>
          <p>
            最大約48日先まで探索し、時間条件も天候条件も無い常時釣獲魚は無限窓として即返す、
            という短絡処理も入れています。同じロジックを
            <strong className="text-moonlight">「漁師の直感」の予測魚</strong>にも再利用し、
            下ごしらえの魚がいつ釣れるかまで算出します。
          </p>
        </Section>

        <Section eyebrow="Data" title="データパイプライン">
          <p>
            魚・天候・釣り場の一次データは、コミュニティの
            <a
              href="https://github.com/icykoneko/ff14-fish-tracker-app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-hookgold underline"
            >
              ff14-fish-tracker-app
            </a>{" "}
            を出典としています。`extract_nushi.py` が以下を突き合わせて、アプリが読む
            JSON に整形します。
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>釣り餌・泳がせルート・漁師の直感・アタリ強さ・フィッシュアイ・ルアーリング</li>
            <li>アイコン/マップ画像 (XIVAPI)、最寄りエーテライト (Teamcraft)、ロードストーンID</li>
            <li>ゾーン別の天候累積確率テーブル、時間帯・天候条件、出現率(uptime%)の事前計算</li>
          </ul>
          <p className="text-xs text-moonlight-faint">
            全 377 エントリの釣り餌を出典の bestCatchPath と 1件ずつ突き合わせて検証済み。
          </p>
        </Section>

        <Section eyebrow="Craft" title="その他の作り込み">
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong className="text-moonlight">SEO</strong> — ページ別メタデータ・
              sitemap.xml・robots.txt・JSON-LD 構造化データ・OG画像を自作
              (日本語フォントをサブセット化して生成)
            </li>
            <li>
              <strong className="text-moonlight">UX</strong> — 出現が近い順ソート、拡張・状態・
              種別フィルタ、ピン留めと10分前通知 (Web Notifications)、餌別逆引き
            </li>
            <li>
              <strong className="text-moonlight">データ保全</strong> — 釣獲記録の
              エクスポート/インポート (統合・置き換え) で端末移行に対応
            </li>
            <li>
              <strong className="text-moonlight">モバイル最適化</strong> — 2行レイアウト・
              ツールバー圧縮でスマホ実機での操作性を確保
            </li>
          </ul>
        </Section>

        <Section eyebrow="Compliance" title="規約順守について">
          <p>
            本サイトはファンによる非公式ツールであり、スクウェア・エニックスの
            「著作物利用許諾条件」に従い<strong className="text-moonlight">非営利で運営</strong>しています
            (広告・アフィリエイト等は掲載していません)。ゲーム画像・アイコンは同条件の範囲で利用しています。
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            <Link href="/" className="text-hookgold underline">
              → トラッカーを使う
            </Link>
          </p>
        </Section>
      </div>

      <SiteFooter />
    </main>
  );
}
