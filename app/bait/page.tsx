"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import nushiData from "@/data/nushi_data.json";
import type { Nushi } from "@/lib/types";
import { iconUrl, lodestoneUrl, spotUrl } from "@/lib/assets";
import { useCaught } from "@/lib/useCaught";
import SiteFooter from "@/components/SiteFooter";

const allNushi = nushiData as unknown as Nushi[];
type Bait = Nushi["baitPath"][number];

export default function BaitPage() {
  const [query, setQuery] = useState("");
  const [uncaughtOnly, setUncaughtOnly] = useState(false);
  const { caught, toggle, loaded } = useCaught();

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    // 餌 (baitPath 先頭 = 投げる餌) ごとにヌシをまとめる
    const m = new Map<string, { bait: Bait; fish: Nushi[] }>();
    for (const n of allNushi) {
      const b = n.baitPath[0];
      if (!b) continue;
      const key = b.id != null ? `id${b.id}` : (b.ja ?? b.en);
      if (!m.has(key)) m.set(key, { bait: b, fish: [] });
      m.get(key)!.fish.push(n);
    }
    const arr = Array.from(m.values())
      .map((g) => {
        const baitName = (g.bait.ja ?? g.bait.en ?? "").toLowerCase();
        const baitMatch = !q || baitName.includes(q);
        const fish = g.fish.filter((n) => {
          if (uncaughtOnly && n.id !== null && caught.has(n.id)) return false;
          if (baitMatch) return true;
          return (
            (n.nameJa ?? "").toLowerCase().includes(q) ||
            n.name.toLowerCase().includes(q) ||
            (n.spotNameJa ?? "").toLowerCase().includes(q)
          );
        });
        // ヌシ→大物優先→パッチ→名前
        fish.sort(
          (a, b) =>
            Number(b.bigFish) - Number(a.bigFish) ||
            parseFloat(String(a.patch)) - parseFloat(String(b.patch)) ||
            (a.nameJa ?? "").localeCompare(b.nameJa ?? "", "ja")
        );
        return { ...g, fish };
      })
      .filter((g) => g.fish.length > 0);
    // 匹数の多い餌を上に、次に餌名
    arr.sort(
      (a, b) =>
        b.fish.length - a.fish.length ||
        (a.bait.ja ?? "").localeCompare(b.bait.ja ?? "", "ja")
    );
    return arr;
  }, [query, uncaughtOnly, caught]);

  const totalCaught = allNushi.filter(
    (n) => n.id !== null && caught.has(n.id)
  ).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link href="/" className="text-moonlight-dim underline hover:text-moonlight">
              ← トラッカー
            </Link>
            <Link href="/list" className="text-moonlight-dim underline hover:text-moonlight">
              📖 図鑑
            </Link>
            <Link
              href="/achievements"
              className="text-moonlight-dim underline hover:text-moonlight"
            >
              🏆 アチーブメント
            </Link>
          </div>
          <h1 className="font-display text-3xl font-bold text-moonlight">
            <span className="text-hookgold">餌</span>別ヌシ一覧
          </h1>
          <p className="mt-1 text-sm text-moonlight-dim">
            その釣り餌で釣れるヌシをまとめて表示 ・ 全{allNushi.length}種 ・ 釣獲済み{" "}
            <span className="text-hookgold-bright font-bold">
              {loaded ? totalCaught : "…"}
            </span>{" "}
            種
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="餌名・魚名で検索…"
            className="w-56 rounded-md border border-abyss-700 bg-abyss-800 px-3 py-2 text-sm text-moonlight placeholder:text-moonlight-faint focus:border-hookgold focus:outline-none"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-moonlight-dim">
            <input
              type="checkbox"
              checked={uncaughtOnly}
              onChange={(e) => setUncaughtOnly(e.target.checked)}
              className="accent-hookgold"
            />
            未釣獲のみ
          </label>
        </div>
      </header>

      <p className="mb-4 text-xs text-moonlight-faint">
        泳がせを使うヌシは「泳がせ」と表示（先頭の投げ餌でグループ化しています）。餌のアイコン・魚のアイコンからロードストーンを開けます。
      </p>

      {groups.length === 0 ? (
        <div className="py-16 text-center text-sm text-moonlight-faint">
          該当する餌・ヌシがありません
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section
              key={g.bait.id ?? g.bait.ja ?? g.bait.en}
              className="overflow-hidden rounded-xl border border-abyss-700 bg-abyss-900/70 shadow-deep"
            >
              <div className="flex items-center gap-2 border-b border-abyss-700 bg-abyss-800 px-4 py-2">
                <span className="text-xs text-moonlight-faint">餌</span>
                {g.bait.icon &&
                  (g.bait.lodestoneId ? (
                    <a
                      href={lodestoneUrl(g.bait.lodestoneId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-moonlight hover:text-hookgold-bright"
                    >
                      <img
                        src={iconUrl(g.bait.icon)}
                        alt=""
                        width={24}
                        height={24}
                        className="rounded border border-abyss-600"
                      />
                      <span className="font-display">{g.bait.ja ?? g.bait.en}</span>
                    </a>
                  ) : (
                    <span className="flex items-center gap-1.5 font-display text-moonlight">
                      <img src={iconUrl(g.bait.icon)} alt="" width={24} height={24} />
                      {g.bait.ja ?? g.bait.en}
                    </span>
                  ))}
                <span className="ml-auto text-xs text-moonlight-faint">
                  {g.fish.length}種
                </span>
              </div>

              <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {g.fish.map((n) => {
                  const isCaught = n.id !== null && caught.has(n.id);
                  return (
                    <li
                      key={`${n.name}-${n.spotId}`}
                      className={`flex items-center gap-3 border-b border-abyss-700/40 px-4 py-2 ${
                        isCaught ? "opacity-55" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isCaught}
                        onChange={() => n.id !== null && toggle(n.id)}
                        className="h-4 w-4 shrink-0 accent-hookgold"
                        aria-label={`${n.nameJa ?? n.name} 釣獲済み`}
                      />
                      {n.icon &&
                        (n.lodestoneId ? (
                          <a
                            href={lodestoneUrl(n.lodestoneId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`${n.nameJa ?? n.name} をロードストーンで見る`}
                            className="shrink-0 transition-transform hover:scale-110"
                          >
                            <img
                              src={iconUrl(n.icon)}
                              alt={n.nameJa ?? n.name}
                              width={32}
                              height={32}
                              className="rounded border border-abyss-600 bg-abyss-900"
                            />
                          </a>
                        ) : (
                          <img
                            src={iconUrl(n.icon)}
                            alt={n.nameJa ?? n.name}
                            width={32}
                            height={32}
                            className="shrink-0 rounded border border-abyss-600 bg-abyss-900"
                          />
                        ))}
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-sm ${
                            isCaught ? "text-moonlight-dim line-through" : "text-moonlight"
                          }`}
                        >
                          {n.nameJa ?? n.name}
                          {n.oonushi ? (
                            <span className="ml-1.5 rounded bg-hookgold px-1 text-[10px] font-bold text-abyss align-middle">
                              オオヌシ
                            </span>
                          ) : (
                            n.bigFish && (
                              <span className="ml-1.5 rounded border border-hookgold-deep px-1 text-[10px] text-hookgold align-middle">
                                ヌシ
                              </span>
                            )
                          )}
                          {n.baitPath.length > 1 && (
                            <span className="ml-1 text-[10px] text-moonlight-faint align-middle">
                              泳がせ
                            </span>
                          )}
                          {n.lure && (
                            <span className="ml-1 text-[10px] text-hookgold-bright align-middle">
                              {n.lure === "Ambitious" ? "アンビシャス" : "モデスト"}
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-moonlight-faint">
                          {n.spotId !== null ? (
                            <Link
                              href={spotUrl(n.spotId)}
                              className="underline decoration-dotted underline-offset-2 hover:text-hookgold-bright"
                            >
                              {n.spotNameJa ?? n.spotName ?? "—"}
                            </Link>
                          ) : (
                            (n.spotNameJa ?? n.spotName ?? "—")
                          )}{" "}
                          ・ {n.patch}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <SiteFooter />
    </main>
  );
}
