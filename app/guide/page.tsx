import Link from "next/link";
import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "ヌシ釣りの始め方",
  description:
    "FFXIV のヌシ釣りをこれから始める人向けの準備ガイド。漁師の始め方、必要なレベルとアクション、持ち物、アタリとフッキングの使い分け、時間と天候の仕組み、漁師の直感まで順を追って解説します。",
  alternates: { canonical: "/guide" },
  openGraph: {
    title: "ヌシ釣りの始め方 | FFXIV 太公望への道",
    description:
      "漁師の始め方から必要なアクション・持ち物・釣り方の基本まで、ヌシ釣りを始めるための準備をまとめました。",
    url: "/guide",
  },
};

function Section({
  step,
  title,
  children,
}: {
  step?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-abyss-700 bg-abyss-900/70 p-5 shadow-deep sm:p-6">
      {step && (
        <div className="mb-1 text-xs font-bold uppercase tracking-widest text-hookgold">
          {step}
        </div>
      )}
      <h2 className="mb-3 font-display text-lg text-moonlight sm:text-xl">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-moonlight-dim">
        {children}
      </div>
    </section>
  );
}

/** 横スクロールできる表 (モバイルでページ自体を横スクロールさせない) */
function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-left text-xs">
        {children}
      </table>
    </div>
  );
}

const TH = "border-b border-abyss-600 px-2 py-1.5 font-normal text-moonlight-faint";
const TD = "border-b border-abyss-700/60 px-2 py-1.5 align-top";

const TOC = [
  ["what", "ヌシとは何か"],
  ["start", "漁師を始める"],
  ["level", "レベルと装備を整える"],
  ["actions", "覚えておくアクション"],
  ["items", "持ち物を用意する"],
  ["flow", "釣り方の基本"],
  ["tug", "アタリとフッキング"],
  ["time", "時間と天候の仕組み"],
  ["mooch", "泳がせ釣り"],
  ["intuition", "漁師の直感"],
  ["usage", "このサイトの使い方"],
] as const;

export default function GuidePage() {
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
          ヌシ釣りの<span className="text-hookgold">始め方</span>
        </h1>
        <p className="mt-1 text-sm text-moonlight-dim">
          これからヌシを狙う人のための準備ガイド
        </p>
      </header>

      <nav className="mb-5 rounded-xl border border-abyss-700 bg-abyss-800/60 p-4 text-sm">
        <div className="mb-2 text-xs text-moonlight-faint">このページの内容</div>
        <ol className="ml-4 list-decimal space-y-1 text-moonlight-dim">
          {TOC.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="underline hover:text-moonlight">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-5">
        <div id="what">
          <Section step="Step 0" title="ヌシとは何か">
            <p>
              <strong className="text-moonlight">ヌシ</strong>は、決まった
              <strong className="text-moonlight">時間帯</strong>や
              <strong className="text-moonlight">天候</strong>でしか釣れない特別な大物です。
              釣り上げるとアチーブメント「太公望」シリーズが進みます。
            </p>
            <p>
              さらに各拡張には、ヌシの中でも最上位の
              <strong className="text-moonlight">オオヌシ</strong>がいます。
              オオヌシは条件が厳しく、後述の「漁師の直感」が必要なものがほとんどです。
            </p>
            <p className="rounded-lg border border-hookgold-deep/50 bg-hookgold/[0.06] px-3 py-2 text-xs">
              普通の魚と違い、ヌシは
              <strong className="text-moonlight">条件が揃う時間帯まで待つ</strong>
              のが基本です。「いつ条件が揃うか」を調べるのがこのサイトの役割です。
            </p>
          </Section>
        </div>

        <div id="start">
          <Section step="Step 1" title="漁師を始める">
            <p>
              まず<strong className="text-moonlight">漁師（フィッシャー）</strong>
              のクラスを取得します。
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                場所:{" "}
                <strong className="text-moonlight">
                  リムサ・ロミンサ 下甲板層の漁師ギルド (X:7.9, Y:14.2)
                </strong>
              </li>
              <li>受付NPC: ン・ンムリカ</li>
              <li>
                他クラスからの転職は<strong className="text-moonlight">Lv10以降</strong>
                （最初の街がリムサ・ロミンサなら最初から選べます）
              </li>
              <li>入門すると釣り手帳と釣り竿・餌がもらえます</li>
            </ul>
            <p>
              以降はレベルの節目ごとに
              <strong className="text-moonlight">クラスクエスト</strong>
              を受けていくと、必要なアクションが自然に揃います。
            </p>
          </Section>
        </div>

        <div id="level">
          <Section step="Step 2" title="レベルと装備を整える">
            <p>
              ヌシには低レベル帯の魚も多くいますが、
              <strong className="text-moonlight">レベルは高いほど有利</strong>です。
              理由は3つあります。
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>後半で覚えるアクション（フィッシュアイ等）がヌシ釣りでほぼ必須</li>
              <li>
                <strong className="text-moonlight">獲得力</strong>
                が足りないと、条件を満たしても釣り上げにくい
              </li>
              <li>最大GPが増え、GP消費アクションを回しやすくなる</li>
            </ul>
            <p>
              目安として<strong className="text-moonlight">Lv50から挑戦可能</strong>、
              快適に狙うなら
              <strong className="text-moonlight">カンスト＋獲得力を盛った装備</strong>
              が理想です。装備はレベル相応のものにマテリアを挿し、獲得力を優先しましょう。
            </p>
            <p className="text-xs text-moonlight-faint">
              ※ 攻略記事では「獲得力405以上」といった具体値が目安として挙げられることがありますが、
              必要値は対象パッチや魚によって変わります。まずは同レベル帯の装備を整えるところから。
            </p>
          </Section>
        </div>

        <div id="actions">
          <Section step="Step 3" title="覚えておくアクション">
            <p>ヌシ釣りで実際に使うものを中心にまとめました。</p>
            <Table>
              <thead>
                <tr>
                  <th className={TH}>アクション</th>
                  <th className={TH}>Lv</th>
                  <th className={TH}>GP</th>
                  <th className={TH}>用途</th>
                </tr>
              </thead>
              <tbody className="text-moonlight-dim">
                <tr>
                  <td className={`${TD} text-moonlight`}>フッキング</td>
                  <td className={TD}>1</td>
                  <td className={TD}>—</td>
                  <td className={TD}>アタリが来たら引っ掛ける。基本操作</td>
                </tr>
                <tr>
                  <td className={`${TD} text-moonlight`}>ペーシェンス</td>
                  <td className={TD}>15</td>
                  <td className={TD}>200</td>
                  <td className={TD}>
                    大物が来やすくなる代わりにフッキング成功率が下がる
                  </td>
                </tr>
                <tr>
                  <td className={`${TD} text-moonlight`}>ストロングフッキング</td>
                  <td className={TD}>15</td>
                  <td className={TD}>50</td>
                  <td className={TD}>強いアタリ（!! / !!!）用のフッキング</td>
                </tr>
                <tr>
                  <td className={`${TD} text-moonlight`}>プレシジョンフッキング</td>
                  <td className={TD}>15</td>
                  <td className={TD}>50</td>
                  <td className={TD}>弱いアタリ（!）用のフッキング</td>
                </tr>
                <tr>
                  <td className={`${TD} text-moonlight`}>リリース</td>
                  <td className={TD}>22</td>
                  <td className={TD}>—</td>
                  <td className={TD}>釣った魚を逃がす（持ち物を圧迫しない）</td>
                </tr>
                <tr>
                  <td className={`${TD} text-moonlight`}>泳がせ釣り</td>
                  <td className={TD}>25</td>
                  <td className={TD}>—</td>
                  <td className={TD}>釣った魚をそのまま餌にする。多くのヌシで必須</td>
                </tr>
                <tr>
                  <td className={`${TD} text-moonlight`}>引掛釣り</td>
                  <td className={TD}>36</td>
                  <td className={TD}>—</td>
                  <td className={TD}>一部の魚の釣獲に必要</td>
                </tr>
                <tr>
                  <td className={`${TD} text-moonlight`}>撒き餌</td>
                  <td className={TD}>54</td>
                  <td className={TD}>145</td>
                  <td className={TD}>次のキャストで食いつきが早くなる</td>
                </tr>
                <tr>
                  <td className={`${TD} text-moonlight`}>フィッシュアイ</td>
                  <td className={TD}>57</td>
                  <td className={TD}>550</td>
                  <td className={TD}>
                    一定時間、魚の
                    <strong className="text-moonlight">時間条件だけ</strong>を無視する
                  </td>
                </tr>
                <tr>
                  <td className={`${TD} text-moonlight`}>ペーシェンスII</td>
                  <td className={TD}>60</td>
                  <td className={TD}>560</td>
                  <td className={TD}>ペーシェンスの強化版</td>
                </tr>
                <tr>
                  <td className={`${TD} text-moonlight`}>トレードリリース</td>
                  <td className={TD}>71</td>
                  <td className={TD}>200</td>
                  <td className={TD}>
                    直前に釣った魚を一定時間かからなくする（雑魚除け）
                  </td>
                </tr>
              </tbody>
            </Table>
            <p className="text-xs text-moonlight-faint">
              ※ ダブルフッキング(Lv65)などの複数取得系は収集向けで、ヌシ狙いでは基本使いません。
              ヌシは1匹ずつ狙う釣りです。
            </p>
          </Section>
        </div>

        <div id="items">
          <Section step="Step 4" title="持ち物を用意する">
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong className="text-moonlight">釣り餌</strong> —
                狙うヌシごとに違います。各ヌシの詳細か{" "}
                <Link href="/bait" className="text-hookgold underline">
                  餌別ヌシ一覧
                </Link>{" "}
                で確認し、多めに買っておきましょう
              </li>
              <li>
                <strong className="text-moonlight">コーディアル類</strong> —
                GPを回復します。フィッシュアイ(550)やペーシェンスII(560)は消費が大きいので、
                狙う前にまとめて用意しておくと安心です
              </li>
              <li>
                <strong className="text-moonlight">魚類伝承録</strong> —
                一部のヌシは対応する伝承録を読んでいないと釣れません。
                各拡張のギャザラー用スクリップ等で入手します
              </li>
              <li>
                <strong className="text-moonlight">風脈の解放</strong> —
                釣り場までの移動が格段に楽になります。ヌシ釣りは移動が多いので強く推奨
              </li>
            </ul>
            <p className="rounded-lg border border-abyss-600 bg-abyss-800/60 px-3 py-2 text-xs">
              釣り場は辺鄙な場所が多いので、各ヌシの
              <strong className="text-moonlight">オススメ転移先（最寄りエーテライト）</strong>
              をこのサイトで確認してから向かうと迷いません。
            </p>
          </Section>
        </div>

        <div id="flow">
          <Section step="Step 5" title="釣り方の基本">
            <ol className="ml-4 list-decimal space-y-1">
              <li>
                狙うヌシの<strong className="text-moonlight">釣り場</strong>へ行く
              </li>
              <li>
                指定の<strong className="text-moonlight">餌</strong>を付ける
              </li>
              <li>
                <strong className="text-moonlight">時間帯・天候</strong>
                の条件が揃うのを待つ
              </li>
              <li>キャスティングして待つ</li>
              <li>
                アタリ（<span className="font-mono">! / !! / !!!</span>）が出たら、
                対応するフッキングを押す
              </li>
            </ol>
            <p>
              条件が揃っていない間、その魚は
              <strong className="text-moonlight">まったく釣れません</strong>。
              闇雲に投げるより、条件が来る時刻を調べて待つのが近道です。
            </p>
          </Section>
        </div>

        <div id="tug">
          <Section step="Step 6" title="アタリとフッキングの使い分け">
            <p>
              アタリの強さは3段階で、魚ごとに決まっています。
              このサイトでは各ヌシに次のマークで表示しています。
            </p>
            <Table>
              <thead>
                <tr>
                  <th className={TH}>アタリ</th>
                  <th className={TH}>強さ</th>
                  <th className={TH}>使うフッキング</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`${TD} font-mono font-bold text-sky-400`}>!</td>
                  <td className={TD}>弱い</td>
                  <td className={`${TD} text-moonlight`}>プレシジョンフッキング</td>
                </tr>
                <tr>
                  <td className={`${TD} font-mono font-bold text-hookgold-bright`}>!!</td>
                  <td className={TD}>中くらい</td>
                  <td className={`${TD} text-moonlight`}>ストロングフッキング</td>
                </tr>
                <tr>
                  <td className={`${TD} font-mono font-bold text-rose-400`}>!!!</td>
                  <td className={TD}>強い</td>
                  <td className={`${TD} text-moonlight`}>ストロングフッキング</td>
                </tr>
              </tbody>
            </Table>
            <p>
              ヌシの多くは
              <span className="font-mono font-bold text-rose-400">!!!</span>
              （強いアタリ）です。ただし例外もあるため、各ヌシの詳細に表示される
              <strong className="text-moonlight">フッキング</strong>
              の指定に従うのが確実です。
            </p>
            <p className="text-xs text-moonlight-faint">
              ※ ペーシェンス中はフッキング成功率が下がりますが、対応するフッキングを使えば
              その低下を打ち消せます。だからアタリの見極めが重要になります。
            </p>
          </Section>
        </div>

        <div id="time">
          <Section step="Step 7" title="時間と天候の仕組み">
            <p>
              ヌシの条件に出てくる「時間」は
              <strong className="text-moonlight">エオルゼア時間（ET）</strong>です。
              現実の約20.6倍の速さで進み、
              <strong className="text-moonlight">ET1日 = 現実70分</strong>です。
            </p>
            <p>
              天候は
              <strong className="text-moonlight">ET8時間（現実23分20秒）ごと</strong>
              に切り替わり、ET 0時 / 8時 / 16時 のタイミングで変わります。
              しかも天候は完全なランダムではなく
              <strong className="text-moonlight">時刻から計算で決まる</strong>ため、
              未来の天候を正確に先読みできます。
            </p>
            <p className="rounded-lg border border-hookgold-deep/50 bg-hookgold/[0.06] px-3 py-2 text-xs">
              このサイトはその計算を再現しているので、
              「次にこのヌシが釣れるのは何月何日の何時か」がそのまま分かります。
              待ち時間の計画に使ってください。
            </p>
          </Section>
        </div>

        <div id="mooch">
          <Section step="Step 8" title="泳がせ釣り">
            <p>
              <strong className="text-moonlight">泳がせ釣り</strong>は、
              釣り上げた魚をリリースせず、そのまま餌にする釣り方です。
              多くのヌシは「餌で小魚を釣る → その小魚で泳がせる」という手順を踏みます。
            </p>
            <p>
              このサイトでは各ヌシの詳細に
              <strong className="text-moonlight">餌 → 中間の魚 → ヌシ</strong>
              の順路を表示しています。中間の魚のアタリも併記しているので、
              その通りにフッキングしてください。
            </p>
            <p className="text-xs text-moonlight-faint">
              ※ 泳がせに使う魚を釣り損ねたらやり直しです。GPと時間に余裕を持って挑みましょう。
            </p>
          </Section>
        </div>

        <div id="intuition">
          <Section step="Step 9" title="漁師の直感">
            <p>
              一部のヌシ（特に<strong className="text-moonlight">オオヌシ</strong>）は、
              条件が揃っているだけでは釣れません。先に
              <strong className="text-moonlight">決められた魚を決められた数だけ釣る</strong>
              と「漁師の直感」というバフが付き、
              <strong className="text-moonlight">その効果時間内だけ</strong>
              本命を狙えるようになります。
            </p>
            <p>
              このサイトでは、直感が必要なヌシの詳細に
              <strong className="text-moonlight">
                先に釣る魚・匹数・その魚自身の条件（餌／時間／天候）
              </strong>
              を表示しています。効果時間も併記しているので、
              時間内に本命へ移れるよう段取りしてください。
            </p>
            <p className="rounded-lg border border-abyss-600 bg-abyss-800/60 px-3 py-2 text-xs">
              直感が必要なヌシは全371件中28件、そのうち19件がオオヌシです。
              裏を返せば、大半のヌシは
              <strong className="text-moonlight">条件が揃えばそのまま狙えます</strong>。
              まずは直感の要らないヌシから慣れるのがおすすめです。
            </p>
          </Section>
        </div>

        <div id="usage">
          <Section step="Step 10" title="このサイトの使い方">
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <Link href="/" className="text-hookgold underline">
                  トラッカー
                </Link>{" "}
                — 出現が近い順に並びます。釣り場・餌・条件・残り時間をその場で確認できます
              </li>
              <li>
                魚名をタップすると<strong className="text-moonlight">詳細</strong>が開き、
                餌の順路・アタリ・フッキング・地図・最寄りエーテライトが出ます
              </li>
              <li>
                <strong className="text-moonlight">★</strong>は釣れる機会の少なさです。
                ★が多いほど条件が揃いにくいので、揃っているうちに狙う価値があります
              </li>
              <li>
                📌でピン留めすると一覧の先頭に固定でき、🔔をオンにすれば
                出現の約10分前に通知が届きます（ページを開いている間）
              </li>
              <li>
                <Link href="/bait" className="text-hookgold underline">
                  餌別ヌシ一覧
                </Link>{" "}
                — 買い出し前に、同じ餌で狙えるヌシをまとめて確認できます
              </li>
              <li>
                <Link href="/achievements" className="text-hookgold underline">
                  アチーブメント
                </Link>{" "}
                — 「太公望」の進捗と、次に狙うべきヌシが分かります
              </li>
              <li>
                釣獲チェックは自動保存されます。機種変更の際は{" "}
                <Link href="/backup" className="text-hookgold underline">
                  バックアップ
                </Link>{" "}
                から書き出しておいてください
              </li>
            </ul>
            <p className="pt-1">
              <Link href="/" className="text-hookgold underline">
                → さっそくヌシを探す
              </Link>
            </p>
          </Section>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
