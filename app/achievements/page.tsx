"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import nushiData from "@/data/nushi_data.json";
import weatherData from "@/data/weather_rates.json";
import achievementsData from "@/data/achievements_data.json";
import type { Achievement, Nushi, UpcomingWindow, WeatherRate } from "@/lib/types";
import { findNextMatchingWeatherWindow } from "@/lib/weather";
import { useCaught } from "@/lib/useCaught";
import EorzeaClock from "@/components/EorzeaClock";

const allNushi = nushiData as unknown as Nushi[];
const weatherRates = (weatherData as unknown as { rates: Record<string, WeatherRate> })
  .rates;
const achievements = achievementsData as unknown as Achievement[];

/** 拡張ごとのヌシ (bigFish) グループ。太公望シリーズのカウント対象 */
const SERIES = [
  {
    key: "legacy",
    title: "太公望への道",
    subtitle: "新生・蒼天・紅蓮エリアのヌシ",
    expansions: [2, 3, 4],
    namePrefix: "太公望への道：ランク",
  },
  {
    key: "shb",
    title: "第一世界の太公望",
    subtitle: "漆黒エリアのヌシ",
    expansions: [5],
    namePrefix: "第一世界の太公望：ランク",
  },
  {
    key: "ew",
    title: "暁月の太公望",
    subtitle: "暁月エリアのヌシ",
    expansions: [6],
    namePrefix: "暁月の太公望：ランク",
  },
  {
    key: "dt",
    title: "黄金の太公望",
    subtitle: "黄金エリアのヌシ",
    expansions: [7],
    namePrefix: "黄金の太公望：ランク",
  },
] as const;

function expansionOf(patch: number | string): number {
  return Math.floor(parseFloat(String(patch)));
}

/** 説明文の「N種類」から必要数を取得 (無ければ1匹 = ランク1) */
function requiredCount(a: Achievement): number {
  const m = (a.descJa ?? "").match(/(\d+)種類/);
  return m ? parseInt(m[1], 10) : 1;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0分";
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}日${h}時間`;
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}

function windowStatus(win: UpcomingWindow | null, nowMs: number): string {
  if (!win) return "窓なし(48日以内)";
  if (win.isAlways) return "常時釣獲可";
  if (win.isActiveNow) return `出現中 残り${formatCountdown(win.endMs - nowMs)}`;
  return `あと${formatCountdown(win.startMs - nowMs)}`;
}

export default function AchievementsPage() {
  const [nowMs, setNowMs] = useState<number | null>(null);
  const { caught } = useCaught();

  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // 未釣獲ヌシの次窓 (道筋の提案用)。30秒粒度で再計算
  const computeTick = nowMs === null ? null : Math.floor(nowMs / 30000);
  const nextWindows = useMemo(() => {
    if (computeTick === null) return new Map<number, UpcomingWindow | null>();
    const t = computeTick * 30000;
    const map = new Map<number, UpcomingWindow | null>();
    for (const n of allNushi) {
      if (!n.bigFish || n.id === null || caught.has(n.id)) continue;
      map.set(
        n.id,
        findNextMatchingWeatherWindow(
          n,
          n.territoryId ? weatherRates[String(n.territoryId)] ?? null : null,
          t
        )
      );
    }
    return map;
  }, [computeTick, caught]);

  if (nowMs === null) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="py-24 text-center text-sm text-moonlight-faint">
          釣果を数えています…
        </div>
      </main>
    );
  }

  const seriesData = SERIES.map((s) => {
    const fish = allNushi.filter(
      (n) => n.bigFish && (s.expansions as readonly number[]).includes(expansionOf(n.patch))
    );
    const caughtCount = fish.filter((n) => n.id !== null && caught.has(n.id)).length;
    const ranks = achievements
      .filter((a) => a.nameJa?.startsWith(s.namePrefix))
      .map((a) => ({ ...a, required: requiredCount(a) }))
      .sort((a, b) => a.required - b.required);
    const nextRank = ranks.find((r) => caughtCount < r.required) ?? null;
    const uncaught = fish
      .filter((n) => n.id !== null && !caught.has(n.id))
      .sort((a, b) => {
        const wa = nextWindows.get(a.id!) ?? null;
        const wb = nextWindows.get(b.id!) ?? null;
        const ka = !wa
          ? Number.POSITIVE_INFINITY
          : wa.isActiveNow
            ? 0
            : wa.startMs - nowMs;
        const kb = !wb
          ? Number.POSITIVE_INFINITY
          : wb.isActiveNow
            ? 0
            : wb.startMs - nowMs;
        return ka - kb;
      });
    return { ...s, fish, caughtCount, ranks, nextRank, uncaught };
  });

  // メタアチーブメント (真/超太公望への道) の達成判定
  const legacyDone = seriesData[0].caughtCount >= 204;
  const shbDone = seriesData[1].caughtCount >= 45;
  const ewDone = seriesData[2].caughtCount >= 40;
  const metaAchievements = [
    {
      name: "真太公望への道",
      desc: "「太公望への道：ランク16」「第一世界の太公望：ランク5」をすべて達成する",
      done: legacyDone && shbDone,
    },
    {
      name: "超太公望への道",
      desc: "「真太公望への道」「暁月の太公望：ランク3」をすべて達成する",
      done: legacyDone && shbDone && ewDone,
    },
  ];

  const taikouNames = new Set(
    achievements
      .filter(
        (a) =>
          a.nameJa &&
          (a.nameJa.includes("太公望") ||
            (a.descJa ?? "").includes("ヌシ"))
      )
      .map((a) => a.id)
  );
  const otherAchievements = achievements.filter((a) => !taikouNames.has(a.id));

  const totalBig = allNushi.filter((n) => n.bigFish).length;
  const totalCaught = allNushi.filter(
    (n) => n.bigFish && n.id !== null && caught.has(n.id)
  ).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex gap-4 text-sm">
            <Link
              href="/"
              className="text-moonlight-dim underline hover:text-moonlight"
            >
              ← トラッカーに戻る
            </Link>
            <Link
              href="/list"
              className="text-moonlight-dim underline hover:text-moonlight"
            >
              📖 図鑑
            </Link>
          </div>
          <h1 className="font-display text-3xl font-bold text-moonlight">
            釣り<span className="text-hookgold">アチーブメント</span>
          </h1>
          <p className="mt-1 text-sm text-moonlight-dim">
            ヌシ釣獲{" "}
            <span className="text-hookgold-bright font-bold">
              {totalCaught}/{totalBig}
            </span>{" "}
            ・ 一覧ページのチェックと連動しています
          </p>
        </div>
        <EorzeaClock nowMs={nowMs} />
      </header>

      <div className="space-y-6">
        {seriesData.map((s) => {
          const pct = s.fish.length > 0 ? (s.caughtCount / s.fish.length) * 100 : 0;
          return (
            <section
              key={s.key}
              className="rounded-xl border border-abyss-700 bg-abyss-900/70 p-5 shadow-deep"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl text-moonlight">
                  {s.title}
                  <span className="ml-2 text-sm text-moonlight-dim">{s.subtitle}</span>
                </h2>
                <div className="font-mono text-lg text-hookgold-bright tabular-nums">
                  {s.caughtCount}/{s.fish.length}
                </div>
              </div>

              <div className="mt-3 h-2 w-full rounded-full bg-abyss-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-hookgold-deep to-hookgold-bright"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* ランク一覧 */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {s.ranks.map((r) => {
                  const done = s.caughtCount >= r.required;
                  const isNext = s.nextRank?.id === r.id;
                  return (
                    <span
                      key={r.id}
                      title={`${r.nameJa} — ${r.descJa}`}
                      className={`rounded px-2 py-0.5 text-xs tabular-nums ${
                        done
                          ? "bg-hookgold-deep/40 text-hookgold-bright"
                          : isNext
                            ? "border border-hookgold text-hookgold"
                            : "border border-abyss-600 text-moonlight-faint"
                      }`}
                    >
                      {r.nameJa?.replace(s.namePrefix, "R")} ({r.required})
                      {done && " ✓"}
                    </span>
                  );
                })}
              </div>

              {/* 道筋 */}
              {s.nextRank ? (
                <div className="mt-4 rounded-lg border border-abyss-700 bg-abyss-800/60 p-4">
                  <div className="text-sm text-moonlight">
                    次の目標:{" "}
                    <span className="text-hookgold">{s.nextRank.nameJa}</span>
                    <span className="ml-2 text-moonlight-dim">
                      あと{" "}
                      <span className="font-bold text-hookgold-bright">
                        {s.nextRank.required - s.caughtCount}
                      </span>{" "}
                      種
                    </span>
                  </div>
                  {s.uncaught.length > 0 && (
                    <>
                      <div className="mt-3 text-xs text-moonlight-faint">
                        いま狙いやすい未釣獲ヌシ (窓が近い順):
                      </div>
                      <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                        {s.uncaught.slice(0, 6).map((n) => {
                          const win = nextWindows.get(n.id!) ?? null;
                          const active = win?.isActiveNow ?? false;
                          return (
                            <li
                              key={n.id}
                              className="flex items-baseline justify-between gap-2 text-sm"
                            >
                              <span className="truncate text-moonlight">
                                {n.nameJa}
                                <span className="ml-1.5 text-xs text-moonlight-faint">
                                  {n.zoneNameJa}
                                </span>
                              </span>
                              <span
                                className={`shrink-0 text-xs tabular-nums ${
                                  active ? "text-tide-active font-bold" : "text-moonlight-dim"
                                }`}
                              >
                                {windowStatus(win, nowMs)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-4 text-sm text-tide-active">
                  🎉 このシリーズはコンプリート済みです
                </div>
              )}
            </section>
          );
        })}

        {/* メタアチーブメント */}
        <section className="rounded-xl border border-abyss-700 bg-abyss-900/70 p-5 shadow-deep">
          <h2 className="font-display text-xl text-moonlight">称号アチーブメント</h2>
          <ul className="mt-3 space-y-2">
            {metaAchievements.map((m) => (
              <li key={m.name} className="flex items-baseline gap-3 text-sm">
                <span
                  className={
                    m.done ? "text-hookgold-bright" : "text-moonlight-faint"
                  }
                >
                  {m.done ? "✓" : "○"}
                </span>
                <span className={m.done ? "text-hookgold-bright" : "text-moonlight"}>
                  {m.name}
                </span>
                <span className="text-xs text-moonlight-dim">{m.desc}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* その他の漁師アチーブメント */}
        <section className="rounded-xl border border-abyss-700 bg-abyss-900/70 p-5 shadow-deep">
          <details>
            <summary className="cursor-pointer font-display text-xl text-moonlight">
              その他の漁師アチーブメント
              <span className="ml-2 text-sm text-moonlight-dim">
                ({otherAchievements.length}件 — 釣獲回数・伝承録・オーシャンフィッシング等)
              </span>
            </summary>
            <p className="mt-2 text-xs text-moonlight-faint">
              これらはゲーム内の進捗と自動連動しません。ゲーム内のアチーブメント画面
              (キャラクター → アチーブメント → クラフター/ギャザラー → 漁師) で確認してください。
            </p>
            <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {otherAchievements.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="text-moonlight">{a.nameJa}</span>
                  <div className="text-xs text-moonlight-faint">{a.descJa}</div>
                </li>
              ))}
            </ul>
          </details>
        </section>
      </div>

      <footer className="mt-6 text-center text-xs text-moonlight-faint">
        アチーブメントデータ: XIVAPI ・ FINAL FANTASY XIV © SQUARE ENIX CO., LTD.
      </footer>
    </main>
  );
}
