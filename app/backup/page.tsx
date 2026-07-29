"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import {
  buildBackup,
  parseBackup,
  applyBackup,
  type BackupData,
} from "@/lib/backup";

type Counts = { caught: number; prep: number; pinned: number };

function countsOf(d: BackupData): Counts {
  return { caught: d.caught.length, prep: d.prep.length, pinned: d.pinned.length };
}

export default function BackupPage() {
  const [current, setCurrent] = useState<Counts | null>(null);
  const [pending, setPending] = useState<{ data: BackupData; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 現在の記録件数を読み込む (クライアントのみ)
  useEffect(() => {
    setCurrent(countsOf(buildBackup()));
  }, []);

  function handleExport() {
    const data = buildBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    a.href = url;
    a.download = `taikoubou-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setDone(null);
    setPending(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = parseBackup(String(reader.result ?? ""));
        setPending({ data, name: file.name });
      } catch (err) {
        setError(err instanceof Error ? err.message : "読み込みに失敗しました。");
      }
    };
    reader.onerror = () => setError("ファイルの読み込みに失敗しました。");
    reader.readAsText(file);
    // 同じファイルを連続で選べるようにリセット
    e.target.value = "";
  }

  function apply(mode: "merge" | "replace") {
    if (!pending) return;
    if (
      mode === "replace" &&
      !confirm(
        "現在このブラウザに保存されている記録をすべて破棄して、ファイルの内容で置き換えます。よろしいですか？"
      )
    ) {
      return;
    }
    applyBackup(pending.data, mode);
    setDone(
      mode === "replace"
        ? "ファイルの内容で置き換えました。"
        : "現在の記録に取り込みました。"
    );
    setPending(null);
    setCurrent(countsOf(buildBackup()));
    // 各ページの表示へ反映するため少し待って再読み込み
    setTimeout(() => window.location.reload(), 900);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
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
          データの<span className="text-hookgold">バックアップ</span>
        </h1>
        <p className="mt-1 text-sm text-moonlight-dim">
          釣獲済み・下ごしらえ・ピン留めの記録をファイルに保存／復元します。
        </p>
      </header>

      <div className="mb-5 rounded-lg border border-hookgold-deep/60 bg-hookgold/[0.06] px-4 py-3 text-xs leading-relaxed text-moonlight-dim">
        釣獲などの記録は、このブラウザの中だけに保存されています。
        <strong className="text-moonlight">
          キャッシュの削除・別の端末やブラウザへの移行では記録が引き継がれません。
        </strong>
        大切な進捗は定期的にエクスポートして保管し、機種変更の際はインポートで復元してください。
      </div>

      {/* 現在の記録 */}
      <section className="mb-5 rounded-xl border border-abyss-700 bg-abyss-900/70 p-5 shadow-deep">
        <h2 className="mb-3 font-display text-lg text-moonlight">現在の記録</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          {(
            [
              ["釣獲済み", current?.caught],
              ["下ごしらえ", current?.prep],
              ["ピン留め", current?.pinned],
            ] as const
          ).map(([label, n]) => (
            <div key={label} className="rounded-lg border border-abyss-700 bg-abyss-800 py-3">
              <div className="text-2xl font-bold text-hookgold-bright">
                {n ?? "…"}
              </div>
              <div className="mt-0.5 text-xs text-moonlight-faint">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* エクスポート */}
      <section className="mb-5 rounded-xl border border-abyss-700 bg-abyss-900/70 p-5 shadow-deep">
        <h2 className="mb-2 font-display text-lg text-moonlight">
          エクスポート（保存）
        </h2>
        <p className="mb-3 text-sm text-moonlight-dim">
          現在の記録を JSON ファイルとしてダウンロードします。安全な場所に保管してください。
        </p>
        <button
          onClick={handleExport}
          className="rounded-lg border border-hookgold-deep bg-abyss-800 px-4 py-2 text-sm font-bold text-hookgold transition-colors hover:bg-abyss-700 hover:text-hookgold-bright"
        >
          ⬇ バックアップを書き出す
        </button>
      </section>

      {/* インポート */}
      <section className="rounded-xl border border-abyss-700 bg-abyss-900/70 p-5 shadow-deep">
        <h2 className="mb-2 font-display text-lg text-moonlight">
          インポート（復元）
        </h2>
        <p className="mb-3 text-sm text-moonlight-dim">
          書き出したバックアップファイルを選ぶと、内容を確認してから取り込めます。
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-abyss-600 bg-abyss-800 px-4 py-2 text-sm text-moonlight transition-colors hover:bg-abyss-700"
        >
          📂 ファイルを選ぶ…
        </button>

        {error && (
          <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        {done && (
          <p className="mt-3 rounded-md border border-tide-active/40 bg-tide-active/10 px-3 py-2 text-sm text-tide-active">
            {done} 反映のため画面を更新します…
          </p>
        )}

        {pending && (
          <div className="mt-4 rounded-lg border border-hookgold-deep bg-abyss-800/80 p-4">
            <div className="mb-1 text-sm text-moonlight">
              <span className="text-moonlight-faint">ファイル: </span>
              {pending.name}
            </div>
            <div className="mb-3 text-sm text-moonlight-dim">
              釣獲済み{" "}
              <b className="text-hookgold-bright">{pending.data.caught.length}</b> 件 ・
              下ごしらえ{" "}
              <b className="text-hookgold-bright">{pending.data.prep.length}</b> 件 ・
              ピン留め{" "}
              <b className="text-hookgold-bright">{pending.data.pinned.length}</b> 件
              {pending.data.exportedAt && (
                <span className="ml-1 text-xs text-moonlight-faint">
                  （{new Date(pending.data.exportedAt).toLocaleString("ja-JP")} 書き出し）
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => apply("merge")}
                className="rounded-lg border border-hookgold-deep bg-abyss-800 px-4 py-2 text-sm font-bold text-hookgold transition-colors hover:bg-abyss-700 hover:text-hookgold-bright"
              >
                現在の記録に取り込む（統合）
              </button>
              <button
                onClick={() => apply("replace")}
                className="rounded-lg border border-rose-500/50 bg-abyss-800 px-4 py-2 text-sm text-rose-200 transition-colors hover:bg-rose-500/10"
              >
                置き換える（現在の記録を破棄）
              </button>
              <button
                onClick={() => setPending(null)}
                className="rounded-lg px-3 py-2 text-sm text-moonlight-faint underline hover:text-moonlight"
              >
                キャンセル
              </button>
            </div>
            <p className="mt-2 text-xs text-moonlight-faint">
              「統合」は現在の記録を残したままファイルの内容を追加します（重複は自動でまとめられます）。
            </p>
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
