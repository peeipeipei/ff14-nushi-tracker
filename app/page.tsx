"use client";

import { useEffect, useMemo, useState } from "react";
import nushiData from "@/data/nushi_data.json";
import weatherData from "@/data/weather_rates.json";
import type { Nushi, UpcomingWindow, WeatherRate, WeatherTypeInfo } from "@/lib/types";
import { findNextMatchingWeatherWindow } from "@/lib/weather";
import EorzeaClock from "@/components/EorzeaClock";
import NushiRow from "@/components/NushiRow";

const allNushi = nushiData as unknown as Nushi[];
const weatherRates = (weatherData as unknown as { rates: Record<string, WeatherRate> })
  .rates;
const weatherTypes = (weatherData as unknown as { types: Record<string, WeatherTypeInfo> })
  .types;

interface Row {
  nushi: Nushi;
  window: UpcomingWindow | null;
}

/** ソートキー: 開催中(常時含む)は0、待機中は開始までのms、窓なしは無限大 */
function sortKey(row: Row, nowMs: number): number {
  if (!row.window) return Number.POSITIVE_INFINITY;
  if (row.window.isActiveNow) return 0;
  return row.window.startMs - nowMs;
}

export default function Home() {
  // SSR とのハイドレーション不一致を避けるため、時刻はマウント後に初期化する
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // 窓の再計算は30秒粒度 (計算自体は数十msなので体感遅延なし)
  const computeTick = nowMs === null ? null : Math.floor(nowMs / 30000);
  const rows = useMemo<Row[]>(() => {
    if (computeTick === null) return [];
    const t = computeTick * 30000;
    return allNushi.map((nushi) => ({
      nushi,
      window: findNextMatchingWeatherWindow(
        nushi,
        nushi.territoryId ? weatherRates[String(nushi.territoryId)] ?? null : null,
        t
      ),
    }));
  }, [computeTick]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (activeOnly && !(r.window?.isActiveNow ?? false)) return false;
        if (!q) return true;
        return (
          r.nushi.name.toLowerCase().includes(q) ||
          (r.nushi.nameJa ?? "").toLowerCase().includes(q) ||
          (r.nushi.spotNameJa ?? "").toLowerCase().includes(q) ||
          (r.nushi.zoneNameJa ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => sortKey(a, nowMs ?? 0) - sortKey(b, nowMs ?? 0));
  }, [rows, query, activeOnly, nowMs]);

  const activeCount = rows.filter((r) => r.window?.isActiveNow).length;

  if (nowMs === null) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="py-24 text-center text-sm text-moonlight-faint">
          潮を読んでいます…
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-moonlight">
            ヌシ釣り<span className="text-hookgold">トラッカー</span>
          </h1>
          <p className="mt-1 text-sm text-moonlight-dim">
            全{allNushi.length}種のヌシ ・ いま釣れる{" "}
            <span className="text-tide-active font-bold">{activeCount}</span> 種
          </p>
        </div>
        <EorzeaClock nowMs={nowMs} />
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="魚名・釣り場・エリアで検索…"
          className="w-64 rounded-md border border-abyss-700 bg-abyss-800 px-3 py-2 text-sm text-moonlight placeholder:text-moonlight-faint focus:border-hookgold focus:outline-none"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-moonlight-dim">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="accent-hookgold"
          />
          開催中のみ
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-abyss-700 bg-abyss-900/70 shadow-deep">
        <div className="hidden grid-cols-[minmax(180px,1.2fr)_minmax(140px,1fr)_minmax(150px,1fr)_minmax(120px,0.9fr)] gap-x-4 border-b border-abyss-700 bg-abyss-800 px-4 py-2 text-[11px] uppercase tracking-wider text-moonlight-dim sm:grid">
          <div>ヌシ</div>
          <div>釣り場</div>
          <div>条件 (ET / 天候)</div>
          <div className="text-right">次の窓</div>
        </div>
        {visible.map((r) => (
          <NushiRow
            key={`${r.nushi.name}-${r.nushi.spotId}`}
            nushi={r.nushi}
            window={r.window}
            nowMs={nowMs}
            weatherTypes={weatherTypes}
          />
        ))}
        {visible.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-moonlight-faint">
            条件に一致するヌシがいません
          </div>
        )}
      </div>

      <footer className="mt-6 text-center text-xs text-moonlight-faint">
        データ出典:{" "}
        <a
          href="https://github.com/icykoneko/ff14-fish-tracker-app"
          className="underline hover:text-moonlight-dim"
        >
          ff14-fish-tracker-app
        </a>{" "}
        ・ FINAL FANTASY XIV © SQUARE ENIX CO., LTD.
      </footer>
    </main>
  );
}
