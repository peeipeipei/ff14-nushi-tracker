"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import nushiData from "@/data/nushi_data.json";
import weatherData from "@/data/weather_rates.json";
import type { Nushi, UpcomingWindow, WeatherRate, WeatherTypeInfo } from "@/lib/types";
import { findNextMatchingWeatherWindow } from "@/lib/weather";
import { useCaught } from "@/lib/useCaught";
import EorzeaClock from "@/components/EorzeaClock";
import NushiRow from "@/components/NushiRow";

const allNushi = nushiData as unknown as Nushi[];
const weatherRates = (weatherData as unknown as { rates: Record<string, WeatherRate> })
  .rates;
const weatherTypes = (weatherData as unknown as { types: Record<string, WeatherTypeInfo> })
  .types;

const BIG_FISH_TOTAL = allNushi.filter((n) => n.bigFish).length;

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

const EXPANSIONS = [
  { key: 2, label: "新生" },
  { key: 3, label: "蒼天" },
  { key: 4, label: "紅蓮" },
  { key: 5, label: "漆黒" },
  { key: 6, label: "暁月" },
  { key: 7, label: "黄金" },
] as const;

type TypeFilter = "all" | "nushi" | "oonushi";
type AvailFilter = "all" | "active" | "always";
type SortMode = "window" | "patch" | "name";

function expansionOf(patch: number | string): number {
  return Math.floor(parseFloat(String(patch)));
}

/** フィルタチップの見た目 (選択中は金地) */
function chipClass(active: boolean): string {
  return `rounded-full px-3 py-1 text-xs transition-colors ${
    active
      ? "bg-hookgold text-abyss font-bold"
      : "border border-abyss-600 text-moonlight-dim hover:border-hookgold-deep hover:text-moonlight"
  }`;
}

const FILTER_STORAGE_KEY = "nushi-filters-v1";

export default function Home() {
  // SSR とのハイドレーション不一致を避けるため、時刻はマウント後に初期化する
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [availFilter, setAvailFilter] = useState<AvailFilter>("all");
  const [uncaughtOnly, setUncaughtOnly] = useState(false);
  const [expFilters, setExpFilters] = useState<number[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("window");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { caught, toggle } = useCaught();

  useEffect(() => {
    // 保存済みフィルタの復元
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY);
      if (raw) {
        const f = JSON.parse(raw);
        if (["all", "active", "always"].includes(f.availFilter))
          setAvailFilter(f.availFilter);
        if (typeof f.uncaughtOnly === "boolean") setUncaughtOnly(f.uncaughtOnly);
        if (Array.isArray(f.expFilters))
          setExpFilters(f.expFilters.filter((x: unknown) => typeof x === "number"));
        if (["all", "nushi", "oonushi"].includes(f.typeFilter))
          setTypeFilter(f.typeFilter);
        if (["window", "patch", "name"].includes(f.sortMode))
          setSortMode(f.sortMode);
      }
    } catch {
      // 壊れた保存値は無視
    }
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // フィルタ状態の保存 (初期化前は保存しない)
  useEffect(() => {
    if (nowMs === null) return;
    try {
      localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({ availFilter, uncaughtOnly, expFilters, typeFilter, sortMode })
      );
    } catch {
      // ストレージ不可でも動作は継続
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availFilter, uncaughtOnly, expFilters, typeFilter, sortMode]);

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
    const filtered = rows.filter((r) => {
      const n = r.nushi;
      // 常時 = 時間・天候の制約がなく常に釣れるもの (isAlways)
      // 開催中 = いま釣獲可能 (常時を含む)
      if (availFilter === "active" && !(r.window?.isActiveNow ?? false)) return false;
      if (availFilter === "always" && !(r.window?.isAlways ?? false)) return false;
      if (uncaughtOnly && n.id !== null && caught.has(n.id)) return false;
      if (expFilters.length > 0 && !expFilters.includes(expansionOf(n.patch)))
        return false;
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
    if (sortMode === "patch") {
      return filtered.sort(
        (a, b) =>
          parseFloat(String(a.nushi.patch)) - parseFloat(String(b.nushi.patch)) ||
          (a.nushi.nameJa ?? "").localeCompare(b.nushi.nameJa ?? "", "ja")
      );
    }
    if (sortMode === "name") {
      return filtered.sort((a, b) =>
        (a.nushi.nameJa ?? a.nushi.name).localeCompare(
          b.nushi.nameJa ?? b.nushi.name,
          "ja"
        )
      );
    }
    return filtered.sort((a, b) => {
      // 順序は30秒毎の窓再計算時のみ変わる。毎秒ソートすると DOM 移動が
      // 画像のロードを中断し続けるため、tick 時刻で安定ソートする
      const t = (computeTick ?? 0) * 30000;
      return sortKey(a, t) - sortKey(b, t);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, availFilter, uncaughtOnly, expFilters, typeFilter, sortMode, caught, computeTick]);

  const activeCount = rows.filter((r) => r.window?.isActiveNow).length;
  const caughtBig = allNushi.filter(
    (n) => n.bigFish && n.id !== null && caught.has(n.id)
  ).length;

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
            全{allNushi.length}種 ・ いま釣れる{" "}
            <span className="text-tide-active font-bold">{activeCount}</span> 種 ・
            釣獲済みヌシ{" "}
            <span className="text-hookgold-bright font-bold">
              {caughtBig}/{BIG_FISH_TOTAL}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/list"
            className="rounded-lg border border-hookgold-deep bg-abyss-800 px-4 py-2 text-sm text-hookgold transition-colors hover:bg-abyss-700 hover:text-hookgold-bright"
          >
            📖 図鑑
          </Link>
          <Link
            href="/achievements"
            className="rounded-lg border border-hookgold-deep bg-abyss-800 px-4 py-2 text-sm text-hookgold transition-colors hover:bg-abyss-700 hover:text-hookgold-bright"
          >
            🏆 アチーブメント
          </Link>
          <EorzeaClock nowMs={nowMs} />
        </div>
      </header>

      <div className="sticky top-0 z-10 -mx-4 mb-4 space-y-2.5 border-b border-abyss-700/60 bg-abyss/90 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
              checked={uncaughtOnly}
              onChange={(e) => setUncaughtOnly(e.target.checked)}
              className="accent-hookgold"
            />
            未釣獲のみ
          </label>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-md border border-abyss-700 bg-abyss-800 px-2 py-2 text-sm text-moonlight focus:border-hookgold focus:outline-none"
            aria-label="並び順"
          >
            <option value="window">窓が近い順</option>
            <option value="patch">パッチ順</option>
            <option value="name">名前順</option>
          </select>
          <span className="ml-auto text-xs text-moonlight-faint tabular-nums">
            表示中 {visible.length} 種
          </span>
        </div>
        {/* 拡張フィルタ (複数選択可) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] text-moonlight-faint">拡張</span>
          <button
            onClick={() => setExpFilters([])}
            className={chipClass(expFilters.length === 0)}
          >
            すべて
          </button>
          {EXPANSIONS.map((e) => (
            <button
              key={e.key}
              onClick={() =>
                setExpFilters((prev) =>
                  prev.includes(e.key)
                    ? prev.filter((k) => k !== e.key)
                    : [...prev, e.key]
                )
              }
              className={chipClass(expFilters.includes(e.key))}
            >
              {e.label}
            </button>
          ))}
        </div>
        {/* 状態フィルタ (常時 / 開催中) と種別フィルタ */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] text-moonlight-faint">状態</span>
          {(
            [
              ["all", "すべて"],
              ["active", "開催中"],
              ["always", "常時"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setAvailFilter(key)}
              className={chipClass(availFilter === key)}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-abyss-600" />
          <span className="mr-1 text-[11px] text-moonlight-faint">種別</span>
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
              className={chipClass(typeFilter === key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-abyss-700 bg-abyss-900/70 shadow-deep">
        <div className="hidden grid-cols-[auto_auto_minmax(150px,1.2fr)_minmax(140px,1fr)_minmax(150px,1fr)_minmax(120px,0.9fr)] gap-x-3 border-b border-abyss-700 bg-abyss-800 px-4 py-2 text-[11px] uppercase tracking-wider text-moonlight-dim sm:grid">
          <div className="w-4">済</div>
          <div className="w-9"></div>
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
            isCaught={r.nushi.id !== null && caught.has(r.nushi.id)}
            onToggleCaught={() => r.nushi.id !== null && toggle(r.nushi.id)}
            expanded={expandedId === r.nushi.id}
            onToggleExpand={() =>
              setExpandedId(expandedId === r.nushi.id ? null : r.nushi.id)
            }
          />
        ))}
        {visible.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-moonlight-faint">
            条件に一致するヌシがいません
          </div>
        )}
      </div>

      <footer className="mt-6 text-center text-xs text-moonlight-faint">
        名前をクリックすると釣り方・釣り場の詳細を表示 ・ データ出典:{" "}
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
