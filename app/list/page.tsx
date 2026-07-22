"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import nushiData from "@/data/nushi_data.json";
import type { Nushi } from "@/lib/types";
import { iconUrl, lodestoneUrl, spotUrl } from "@/lib/assets";
import { useCaught } from "@/lib/useCaught";
import SiteFooter from "@/components/SiteFooter";

const allNushi = nushiData as unknown as Nushi[];

const EXPANSIONS = [
  { key: 2, title: "新生エオルゼア", range: "Patch 2.x" },
  { key: 3, title: "蒼天のイシュガルド", range: "Patch 3.x" },
  { key: 4, title: "紅蓮のリベレーター", range: "Patch 4.x" },
  { key: 5, title: "漆黒のヴィランズ", range: "Patch 5.x" },
  { key: 6, title: "暁月のフィナーレ", range: "Patch 6.x" },
  { key: 7, title: "黄金のレガシー", range: "Patch 7.x" },
] as const;

function expansionOf(patch: number | string): number {
  return Math.floor(parseFloat(String(patch)));
}

type TypeFilter = "all" | "nushi" | "oonushi";

export default function ListPage() {
  const [query, setQuery] = useState("");
  const [uncaughtOnly, setUncaughtOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const { caught, toggle, loaded } = useCaught();

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXPANSIONS.map((exp) => {
      const fish = allNushi.filter((n) => expansionOf(n.patch) === exp.key);
      const caughtCount = fish.filter(
        (n) => n.id !== null && caught.has(n.id)
      ).length;
      const visible = fish.filter((n) => {
        if (uncaughtOnly && n.id !== null && caught.has(n.id)) return false;
        if (typeFilter === "nushi" && !n.bigFish) return false;
        if (typeFilter === "oonushi" && !n.oonushi) return false;
        if (!q) return true;
        return (
          n.name.toLowerCase().includes(q) ||
          (n.nameJa ?? "").toLowerCase().includes(q) ||
          (n.spotNameJa ?? "").toLowerCase().includes(q) ||
          (n.zoneNameJa ?? "").toLowerCase().includes(q)
        );
      });
      return { ...exp, fish, caughtCount, visible };
    });
  }, [query, uncaughtOnly, typeFilter, caught]);

  const totalCaught = allNushi.filter(
    (n) => n.id !== null && caught.has(n.id)
  ).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex gap-4 text-sm">
            <Link href="/" className="text-moonlight-dim underline hover:text-moonlight">
              ← トラッカーに戻る
            </Link>
            <Link
              href="/achievements"
              className="text-moonlight-dim underline hover:text-moonlight"
            >
              🏆 アチーブメント
            </Link>
          </div>
          <h1 className="font-display text-3xl font-bold text-moonlight">
            ヌシ<span className="text-hookgold">図鑑</span>
          </h1>
          <p className="mt-1 text-sm text-moonlight-dim">
            全{allNushi.length}種 ・ 釣獲済み{" "}
            <span className="text-hookgold-bright font-bold">
              {loaded ? totalCaught : "…"}
            </span>{" "}
            種 ・ 画像クリックでロードストーンのアイテムページを開きます
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="魚名・釣り場で検索…"
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
          <div className="flex items-center gap-1.5">
            {(
              [
                ["all", "すべて"],
                ["nushi", "ヌシのみ"],
                ["oonushi", "オオヌシ"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  typeFilter === key
                    ? "bg-hookgold text-abyss font-bold"
                    : "border border-abyss-600 text-moonlight-dim hover:border-hookgold-deep hover:text-moonlight"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.key}>
            <div className="mb-3 flex items-baseline justify-between border-b border-abyss-700 pb-2">
              <h2 className="font-display text-xl text-moonlight">
                {s.title}
                <span className="ml-2 text-sm text-moonlight-dim">{s.range}</span>
              </h2>
              <span className="font-mono text-sm text-hookgold-bright tabular-nums">
                {s.caughtCount}/{s.fish.length}
              </span>
            </div>
            {s.visible.length === 0 ? (
              <div className="py-4 text-sm text-moonlight-faint">
                表示できるヌシがありません
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {s.visible.map((n) => {
                  const isCaught = n.id !== null && caught.has(n.id);
                  return (
                    <li
                      key={`${n.name}-${n.spotId}`}
                      className={`flex items-center gap-3 rounded-lg border border-abyss-700 bg-abyss-900/70 px-3 py-2 transition-colors hover:border-abyss-600 ${
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
                              width={40}
                              height={40}
                              className="rounded border border-abyss-600 bg-abyss-900"
                            />
                          </a>
                        ) : (
                          <img
                            src={iconUrl(n.icon)}
                            alt={n.nameJa ?? n.name}
                            width={40}
                            height={40}
                            className="shrink-0 rounded border border-abyss-600 bg-abyss-900"
                          />
                        ))}
                      <div className="min-w-0 flex-1">
                        <div
                          className={`truncate font-display text-sm ${
                            isCaught
                              ? "text-moonlight-dim line-through"
                              : "text-moonlight"
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
            )}
          </section>
        ))}
      </div>

      <SiteFooter />
    </main>
  );
}
