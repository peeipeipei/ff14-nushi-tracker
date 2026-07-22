import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="text-5xl">🎣</div>
      <h1 className="mt-4 font-display text-2xl font-bold text-moonlight">
        釣り針に何もかかりませんでした
      </h1>
      <p className="mt-2 text-sm text-moonlight-dim">
        お探しのページは見つかりませんでした (404)。
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg border border-hookgold-deep bg-abyss-800 px-4 py-2 text-sm text-hookgold transition-colors hover:bg-abyss-700 hover:text-hookgold-bright"
      >
        トラッカーへ戻る
      </Link>
    </main>
  );
}
